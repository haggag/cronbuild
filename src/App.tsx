import { useEffect, useRef, useState } from "react";
import {
  Clock3,
  Copy,
  Sun,
  Moon,
  ChevronDown,
  ArrowUpRight,
  Check,
  ShieldCheck,
  Link,
  History,
  Terminal,
  AlertCircle,
} from "lucide-react";
import { useCronWorkspace } from "./app/useCronWorkspace";
import { DEFAULT_EXPRESSION, FIELDS } from "./domain/cron/grammar";
import { describe } from "./domain/cron/description";
import {
  EXPORT_TABS,
  actionsWarning,
  buildExport,
} from "./domain/cron/exports";
import { encodeHash } from "./infrastructure/hashState";
import type { HistoryEntry } from "./infrastructure/storage";
import { Builder } from "./components/Builder";
import { Tabs } from "./components/Tabs";
import { Presets } from "./components/Presets";
import { Preview } from "./components/Preview";
function HighlightedCode({ text }: { text: string }) {
  return (
    <code>
      {text
        .split(
          /('[^'\n]*'|"[^"\n]*"|\b[a-zA-Z][a-zA-Z0-9]*:|(?:\*|\b\d+)(?:[/,-]\d+)*)/g,
        )
        .map((part, i) => (
          <span
            key={i}
            className={
              /^["']/.test(part)
                ? "code-string"
                : /:$/.test(part)
                  ? "code-key"
                  : /^(?:\*|\d)/.test(part)
                    ? "code-string"
                    : undefined
            }
          >
            {part}
          </span>
        ))}
    </code>
  );
}
export default function App() {
  const workspace = useCronWorkspace();
  const { state, dispatch, prefs, setPrefs, recent, restore, commitRaw, save } =
    workspace;
  const model = state.validation.model;
  const [presetOpen, setPresetOpen] = useState(false);
  const [exportIndex, setExportIndex] = useState(0);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [manualCopy, setManualCopy] = useState<string | null>(null);
  const [undoHistory, setUndoHistory] = useState<HistoryEntry[] | null>(null);
  const [changed, setChanged] = useState<number[]>([]);
  const previousTokens = useRef(state.validation.tokens);
  const exportTab = EXPORT_TABS[exportIndex];
  const snippet = model
    ? buildExport(exportTab, model, state.zone, state.preview)
    : "";
  useEffect(() => {
    const indices = state.validation.tokens
      .map((token, i) => (token !== previousTokens.current[i] ? i : -1))
      .filter((i) => i >= 0);
    previousTokens.current = state.validation.tokens;
    setChanged(indices);
    const timer = setTimeout(() => setChanged([]), 400);
    return () => clearTimeout(timer);
  }, [state.validation.tokens]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPresetOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => {
      document.removeEventListener("keydown", shortcut);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);
  const copy = async (text: string) => {
    if (model) save(model.expression, true);
    try {
      await navigator.clipboard.writeText(text);
      setManualCopy(null);
      setToast("Copied!");
      if (toastTimer.current) clearTimeout(toastTimer.current);
      toastTimer.current = setTimeout(() => setToast(""), 2000);
    } catch {
      setToast("");
      setManualCopy(text);
    }
  };
  return (
    <>
      <a className="skip-link" href="#workspace">
        Skip to workspace
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/" aria-label="CronBuild home">
            <span className="brand-icon">
              <Clock3 size={22} />
            </span>
            <span>
              Cron<span className="brand-accent">Build</span>
              <span className="version"> / 1.0</span>
            </span>
          </a>
          <div className="header-actions">
            <span className="local-badge">
              <span /> All computation stays here
            </span>
            <button
              className="preset-trigger"
              onClick={() => setPresetOpen(true)}
            >
              Presets <kbd>⌘ K</kbd>
              <ChevronDown size={15} />
            </button>
            <button
              className="icon-button"
              aria-label={`Switch to ${prefs.theme === "dark" ? "light" : "dark"} theme`}
              onClick={() =>
                setPrefs((p) => ({
                  ...p,
                  theme: p.theme === "dark" ? "light" : "dark",
                }))
              }
            >
              {prefs.theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
          </div>
        </div>
      </header>
      <main id="workspace" className="workspace">
        <div className="workspace-heading">
          <div>
            <p className="eyebrow">CRON EXPRESSION WORKSPACE</p>
            <h1>Cron schedule builder</h1>
          </div>
          <a className="text-link" href="/cronbuild-guide.md">
            Syntax guide <ArrowUpRight size={15} />
          </a>
        </div>
        <section
          className="expression-panel"
          aria-label="Cron expression editor"
        >
          <div className="pill-row">
            {FIELDS.map((field, i) => {
              const issue = state.validation.issues.find(
                (issue) => issue.field === field.id,
              );
              return (
                <button
                  key={field.id}
                  className={`cron-pill ${state.activeField === i ? "selected" : ""} ${issue ? "invalid" : ""} ${changed.includes(i) ? "changed" : ""}`}
                  title={
                    issue?.message ??
                    `${field.label}: ${state.validation.tokens[i] ?? "missing"}. Click to configure.`
                  }
                  aria-label={`${field.label}: ${state.validation.tokens[i] ?? "missing"}${issue ? ". " + issue.message : ""}`}
                  onClick={() => {
                    dispatch({ type: "tab", index: i });
                    document.getElementById(`builder-tab-${i}`)?.focus();
                  }}
                >
                  <span className="pill-label">{field.label}</span>
                  <span className="pill-value">
                    {state.validation.tokens[i] || "—"}
                  </span>
                  <span className="pill-bounds">
                    {field.min}–{field.max}
                  </span>
                </button>
              );
            })}
            <button
              className="icon-button pill-copy"
              aria-label="Copy safe cron expression"
              disabled={!model}
              onClick={() => model && copy(model.safeExpression)}
            >
              <Copy size={20} />
            </button>
          </div>
          <div className="raw-row">
            <label htmlFor="raw-cron">
              <Terminal size={17} />
              <span>Expression</span>
            </label>
            <input
              id="raw-cron"
              value={state.raw}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              aria-invalid={!model}
              aria-describedby={model ? "cron-summary" : "validation-errors"}
              placeholder="minute hour day month weekday"
              onChange={(event) => commitRaw(event.target.value)}
              onBlur={() => model && save(model.expression, true)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && model)
                  save(model.expression, true);
              }}
            />
            <button
              className="icon-button"
              aria-label="Copy raw input"
              onClick={() => copy(state.raw)}
            >
              <Copy size={17} />
            </button>
          </div>
          {model ? (
            <div id="cron-summary" className="cron-summary">
              <Check size={19} />
              <p>{describe(model)}</p>
              <span className="badge">Valid cron</span>
            </div>
          ) : (
            <div id="validation-errors" className="validation-errors">
              <AlertCircle size={19} />
              <div>
                {workspace.linkError && (
                  <>
                    <p>{workspace.linkError}</p>
                    <p>
                      Rejected link:{" "}
                      <code>
                        {location.hash.length > 2048
                          ? `${location.hash.slice(0, 100)}… (${location.hash.length} characters)`
                          : location.hash}
                      </code>
                    </p>
                  </>
                )}
                {state.validation.issues.map((issue, i) => (
                  <p key={i}>
                    {issue.message} <span>{issue.remedy}</span>
                  </p>
                ))}
                <button
                  onClick={() =>
                    restore(
                      workspace.linkError
                        ? DEFAULT_EXPRESSION
                        : state.lastValid,
                    )
                  }
                >
                  {workspace.linkError
                    ? "Use default expression"
                    : "Restore last valid"}
                </button>
              </div>
            </div>
          )}
        </section>
        <Builder state={state} dispatch={dispatch} />
        {workspace.localWarning && (
          <p className="notice">{workspace.localWarning}</p>
        )}
        <div className="lower-workspace">
          <Preview
            state={state}
            mode={prefs.timezone}
            local={workspace.local}
            onTimezone={workspace.setTimezone}
            onRefresh={() => dispatch({ type: "refresh", now: Date.now() })}
          />
          <section className="panel exports" aria-labelledby="exports-title">
            <div className="section-heading">
              <h2 id="exports-title">Ready for your stack</h2>
              <span className="eyebrow">02 / EXPORT</span>
            </div>
            <Tabs
              id="export"
              labels={EXPORT_TABS}
              selected={exportIndex}
              onSelect={setExportIndex}
              label="Export format"
            />
            <div
              role="tabpanel"
              id="export-panel"
              aria-labelledby={`export-tab-${exportIndex}`}
            >
              {model ? (
                <>
                  <div className="code-header">
                    <span>
                      <Terminal size={14} />
                      {exportTab === "crontab"
                        ? "crontab"
                        : exportTab === "AI Prompt"
                          ? "prompt.txt"
                          : exportTab === "Kubernetes"
                            ? "cronjob.yaml"
                            : "workflow.yaml"}
                    </span>
                    <span>
                      {exportTab === "AI Prompt"
                        ? "TEXT"
                        : exportTab === "crontab"
                          ? "SHELL"
                          : "YAML"}
                    </span>
                  </div>
                  <pre tabIndex={0} aria-label={`${exportTab} snippet`}>
                    <HighlightedCode text={snippet} />
                  </pre>
                  {model.expression !== model.safeExpression && (
                    <p className="notice">
                      Equivalent cron: <code>{model.safeExpression}</code>.
                      Explicit bounds preserve this schedule’s day semantics.
                    </p>
                  )}
                  <p className="export-note">
                    {exportTab === "crontab"
                      ? `Replace /path/to/script.sh with your command. Configure ${state.zone} in your cron environment; the line itself does not set a timezone.`
                      : exportTab === "GitHub Actions"
                        ? `Workflow fragment; add your jobs. ${actionsWarning(model)}`
                        : exportTab === "Kubernetes"
                          ? "Replace the example image and command with your task. Forbid skips a new run while the previous job is active. Verify your cluster’s timezone and DST behavior."
                          : "Fill in [language/framework] before sending this context to your coding assistant."}
                  </p>
                </>
              ) : (
                <div className="empty-state">
                  Fix the expression to generate an accurate snippet.
                </div>
              )}
              <div className="export-actions">
                <button
                  className="primary-button"
                  disabled={
                    !model ||
                    (exportTab === "AI Prompt" &&
                      !state.preview &&
                      !state.previewError)
                  }
                  onClick={() => copy(snippet)}
                >
                  <Copy size={17} />
                  Copy snippet
                </button>
                <button
                  disabled={!model}
                  onClick={() =>
                    model &&
                    copy(
                      `${location.origin}${location.pathname}${encodeHash(model.expression)}`,
                    )
                  }
                >
                  <Link size={17} />
                  Share URL
                </button>
              </div>
              <p className="helper share-note">
                Links share the expression. Recipients preview it using their
                timezone setting.
              </p>
            </div>
          </section>
        </div>
        <section className="recent-section" aria-labelledby="recent-title">
          <div className="section-heading">
            <h2 id="recent-title">
              <History size={17} />
              Recent expressions
            </h2>
            {recent.length > 0 && (
              <button
                className="text-button"
                onClick={() => {
                  setUndoHistory(recent);
                  workspace.clearRecent();
                }}
              >
                Clear history
              </button>
            )}
            {undoHistory && (
              <button
                className="text-button"
                onClick={() => {
                  workspace.changeHistory(undoHistory);
                  setUndoHistory(null);
                }}
              >
                Undo clear
              </button>
            )}
          </div>
          <div className="recent-chips">
            {recent.length ? (
              recent.map((entry) => (
                <button
                  key={entry.expression}
                  onClick={() => restore(entry.expression)}
                >
                  <code>{entry.expression}</code>
                </button>
              ))
            ) : (
              <p className="helper">
                Your last ten valid expressions will appear here.
              </p>
            )}
          </div>
          {workspace.storageError && (
            <p className="notice">
              Browser storage is unavailable. Your history is kept for this
              session.
            </p>
          )}
        </section>
        <footer>
          <span>
            <ShieldCheck size={15} />
            Client-side. No accounts. No tracking.
          </span>
          <span>Previews schedules · never runs jobs</span>
          <a href="/llms.txt">
            llms.txt <ArrowUpRight size={13} />
          </a>
        </footer>
      </main>
      {presetOpen && (
        <Presets onSelect={restore} onClose={() => setPresetOpen(false)} />
      )}
      <div className={`toast ${toast ? "visible" : ""}`} role="status">
        {toast && (
          <>
            <Check size={17} />
            {toast}
          </>
        )}
      </div>
      {manualCopy !== null && (
        <div
          className="manual-copy"
          role="region"
          aria-label="Manual copy fallback"
        >
          <strong>Clipboard unavailable</strong>
          <p>Select the text and copy it manually.</p>
          <textarea
            aria-label="Text to copy manually"
            readOnly
            value={manualCopy}
            onFocus={(event) => event.target.select()}
          />
          <button onClick={() => setManualCopy(null)}>Dismiss</button>
        </div>
      )}
    </>
  );
}
