import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { appReducer, initialState } from "./appReducer";
import { DEFAULT_EXPRESSION, validate } from "../domain/cron/grammar";
import { decodeHash, encodeHash } from "../infrastructure/hashState";
import {
  HISTORY_KEY,
  PREFERENCES_KEY,
  parseHistory,
  parsePreferences,
  remember,
  type HistoryEntry,
  type Preferences,
} from "../infrastructure/storage";
import type { ScheduleResult } from "../domain/time/schedule";
function localZone() {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!zone) throw new Error("No local timezone");
    new Intl.DateTimeFormat("en", { timeZone: zone }).format(0);
    return { local: zone, localWarning: "" };
  } catch {
    return {
      local: "UTC",
      localWarning:
        "Local timezone detection is unavailable. The preview uses UTC.",
    };
  }
}
function startup() {
  let raw = DEFAULT_EXPRESSION,
    linkError = "",
    storageError = false;
  let prefs = parsePreferences(null),
    recent: HistoryEntry[] = [];
  try {
    prefs = parsePreferences(localStorage.getItem(PREFERENCES_KEY));
    recent = parseHistory(localStorage.getItem(HISTORY_KEY));
  } catch {
    storageError = true;
  }
  if (location.hash)
    try {
      raw = decodeHash(location.hash);
    } catch (error) {
      raw = "";
      linkError = (error as Error).message;
    }
  return { raw, linkError, prefs, recent, storageError, ...localZone() };
}
export function useCronWorkspace() {
  const [initial] = useState(startup);
  const workerRef = useRef<Worker | null>(null);
  useEffect(
    () => () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    },
    [],
  );
  const [prefs, setPrefs] = useState(initial.prefs);
  const [recent, setRecent] = useState(initial.recent);
  const recentRef = useRef(recent);
  const clearedExpression = useRef<string | null>(null);
  const [storageError, setStorageError] = useState(initial.storageError);
  const [linkError, setLinkError] = useState(initial.linkError);
  const [state, dispatch] = useReducer(appReducer, initial, (value) =>
    initialState(
      value.raw,
      value.prefs.timezone === "utc" ? "UTC" : value.local,
      Date.now(),
    ),
  );
  const write = useCallback((key: string, value: unknown) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      setStorageError(true);
    }
  }, []);
  const changeHistory = useCallback(
    (value: HistoryEntry[]) => {
      recentRef.current = value;
      setRecent(value);
      write(HISTORY_KEY, value);
    },
    [write],
  );
  const save = useCallback(
    (expression: string, explicit = false) => {
      if (
        !validate(expression).model ||
        (!explicit && clearedExpression.current === expression)
      )
        return;
      clearedExpression.current = null;
      changeHistory(remember(recentRef.current, expression, Date.now()));
    },
    [changeHistory],
  );
  const commitRaw = (raw: string) => {
    setLinkError("");
    dispatch({ type: "raw", raw, now: Date.now() });
  };
  const restore = (raw: string) => {
    setLinkError("");
    dispatch({ type: "restore", raw, now: Date.now() });
    save(raw, true);
  };
  const model = state.validation.model;
  useEffect(() => {
    if (!model) return;
    const hash = encodeHash(model.expression);
    // URL and persistence failures are reported at this external-system boundary.
    // oxlint-disable-next-line react/set-state-in-effect
    if (location.hash !== hash) {
      try {
        history.replaceState(
          null,
          "",
          `${location.pathname}${location.search}${hash}`,
        );
      } catch {
        // oxlint-disable-next-line react/set-state-in-effect -- Report a History API failure.
        setLinkError(
          "The browser could not update this URL. Copy Share to create a link.",
        );
      }
    }
    const timer = setTimeout(() => save(model.expression), 600);
    return () => clearTimeout(timer);
  }, [model, save]);
  useEffect(() => {
    const onHash = () => {
      try {
        setLinkError("");
        dispatch({
          type: "restore",
          raw: location.hash ? decodeHash(location.hash) : DEFAULT_EXPRESSION,
          now: Date.now(),
        });
      } catch (error) {
        setLinkError((error as Error).message);
        dispatch({ type: "raw", raw: "", now: Date.now() });
      }
    };
    window.addEventListener("hashchange", onHash);
    window.addEventListener("popstate", onHash);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("popstate", onHash);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    // Storage exceptions need user-visible feedback, including during startup.
    // oxlint-disable-next-line react/set-state-in-effect
    write(PREFERENCES_KEY, prefs);
  }, [prefs, write]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === HISTORY_KEY) {
        const value = parseHistory(event.newValue);
        recentRef.current = value;
        setRecent(value);
      }
      if (event.key === PREFERENCES_KEY) {
        const next = parsePreferences(event.newValue);
        setPrefs(next);
        if (next.timezone !== prefs.timezone) {
          dispatch({
            type: "zone",
            zone: next.timezone === "utc" ? "UTC" : initial.local,
            now: Date.now(),
          });
        }
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [initial.local, prefs.timezone]);
  useEffect(() => {
    if (!model) return;
    let worker: Worker | undefined,
      done = false;
    const fail = (message: string) => {
      if (!done) {
        done = true;
        worker?.terminate();
        workerRef.current = null;
        dispatch({ type: "error", revision: state.revision, message });
      }
    };
    const timeout = setTimeout(
      () => fail("Preview took too long. Retry, or simplify the expression."),
      2000,
    );
    try {
      worker =
        workerRef.current ??
        new Worker(new URL("../workers/schedule.worker.ts", import.meta.url), {
          type: "module",
        });
      workerRef.current = worker;
      worker.onmessage = (
        event: MessageEvent<{ result?: ScheduleResult; error?: string }>,
      ) => {
        if (done) return;
        if (event.data.error) fail(event.data.error);
        else if (event.data.result) {
          done = true;
          dispatch({ type: "result", result: event.data.result });
        }
        clearTimeout(timeout);
      };
      worker.onerror = (event) => {
        event.preventDefault();
        fail("Preview worker could not run. Retry the preview.");
        clearTimeout(timeout);
      };
      worker.postMessage({
        revision: state.revision,
        expression: model.expression,
        zone: state.zone,
        reference: state.reference,
      });
    } catch {
      fail(
        "This browser could not start the preview worker. Retry in a current browser.",
      );
      clearTimeout(timeout);
    }
    return () => {
      clearTimeout(timeout);
      if (!done) {
        worker?.terminate();
        workerRef.current = null;
      }
      done = true;
    };
  }, [model, state.revision, state.zone, state.reference]);
  const setTimezone = (timezone: Preferences["timezone"]) => {
    setPrefs((p) => ({ ...p, timezone }));
    dispatch({
      type: "zone",
      zone: timezone === "utc" ? "UTC" : initial.local,
      now: Date.now(),
    });
  };
  const clearRecent = () => {
    clearedExpression.current = model?.expression ?? null;
    changeHistory([]);
  };
  return {
    clearRecent,
    state,
    dispatch,
    prefs,
    setPrefs,
    recent,
    changeHistory,
    save,
    commitRaw,
    restore,
    linkError,
    storageError,
    setTimezone,
    local: initial.local,
    localWarning: initial.localWarning,
  };
}
