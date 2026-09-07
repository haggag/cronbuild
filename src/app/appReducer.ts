import {
  DEFAULT_EXPRESSION,
  FIELDS,
  validate,
  type Validation,
} from "../domain/cron/grammar";
import type { ScheduleResult } from "../domain/time/schedule";
export interface WorkspaceState {
  raw: string;
  validation: Validation;
  lastValid: string;
  revision: number;
  reference: number;
  zone: string;
  activeField: number;
  preview: ScheduleResult | null;
  previewError: string | null;
  incomplete: Partial<Record<number, string>>;
  intervalDrafts: Partial<Record<number, { start: string; step: string }>>;
}
export type Action =
  | { type: "raw" | "restore"; raw: string; now: number }
  | {
      type: "field";
      index: number;
      token: string;
      now: number;
      error?: string;
      interval?: { start: string; step: string };
    }
  | { type: "tab"; index: number }
  | { type: "zone"; zone: string; now: number }
  | { type: "refresh"; now: number }
  | { type: "result"; result: ScheduleResult }
  | { type: "error"; revision: number; message: string };
export function initialState(
  raw: string,
  zone: string,
  now: number,
): WorkspaceState {
  const validation = validate(raw);
  return {
    raw,
    validation,
    lastValid: validation.model?.expression ?? DEFAULT_EXPRESSION,
    revision: 1,
    reference: now,
    zone,
    activeField: 0,
    preview: null,
    previewError: null,
    incomplete: {},
    intervalDrafts: {},
  };
}
function commit(
  state: WorkspaceState,
  raw: string,
  now: number,
  validation = validate(raw),
  incomplete: WorkspaceState["incomplete"] = {},
  intervalDrafts: WorkspaceState["intervalDrafts"] = {},
): WorkspaceState {
  return {
    ...state,
    raw,
    validation,
    lastValid: validation.model?.expression ?? state.lastValid,
    revision: state.revision + 1,
    reference: now,
    preview: null,
    previewError: null,
    incomplete,
    intervalDrafts,
  };
}
export function appReducer(
  state: WorkspaceState,
  action: Action,
): WorkspaceState {
  switch (action.type) {
    case "raw":
    case "restore":
      return commit(state, action.raw, action.now);
    case "field": {
      if (state.validation.tokens.length !== 5) return state;
      const tokens = [...state.validation.tokens];
      tokens[action.index] = action.token;
      const raw = tokens.join(" ");
      const incomplete = { ...state.incomplete };
      const intervalDrafts = { ...state.intervalDrafts };
      if (action.interval) intervalDrafts[action.index] = action.interval;
      else delete intervalDrafts[action.index];
      if (action.error || !action.token)
        incomplete[action.index] =
          action.error ??
          `Select at least one ${FIELDS[action.index].label.toLowerCase()} value.`;
      else delete incomplete[action.index];
      const validation = validate(
        tokens.map((token) => token || "!").join(" "),
      );
      validation.tokens = tokens;
      if (Object.keys(incomplete).length) {
        validation.model = null;
        validation.issues = validation.issues.filter(
          (issue) =>
            !issue.field ||
            incomplete[
              FIELDS.findIndex((field) => field.id === issue.field)
            ] === undefined,
        );
        for (const [key, message] of Object.entries(incomplete)) {
          const index = Number(key);
          const start = tokens
            .slice(0, index)
            .reduce((sum, token) => sum + token.length + 1, 0);
          validation.issues.push({
            code: "incomplete",
            field: FIELDS[index].id,
            start,
            end: start + tokens[index].length,
            message: message!,
            remedy: "Complete the field or choose Every.",
          });
        }
      }
      return commit(
        state,
        raw,
        action.now,
        validation,
        incomplete,
        intervalDrafts,
      );
    }

    case "tab":
      return { ...state, activeField: action.index };
    case "zone":
      return {
        ...state,
        zone: action.zone,
        revision: state.revision + 1,
        reference: action.now,
        preview: null,
        previewError: null,
      };
    case "refresh":
      return {
        ...state,
        revision: state.revision + 1,
        reference: action.now,
        preview: null,
        previewError: null,
      };
    case "result": {
      const r = action.result;
      if (
        !state.validation.model ||
        r.revision !== state.revision ||
        r.expression !== state.validation.model.expression ||
        r.zone !== state.zone ||
        r.reference !== state.reference
      )
        return state;
      return { ...state, preview: r, previewError: null };
    }
    case "error":
      return action.revision === state.revision
        ? { ...state, previewError: action.message, preview: null }
        : state;
  }
}
