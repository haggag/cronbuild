import { describe, expect, it } from "vitest";
import { appReducer, initialState } from "./appReducer";
import { calculateSchedule } from "../domain/time/schedule";
const now = Date.parse("2026-09-07T08:59:00Z");
describe("workspace transitions", () => {
  it("preserves raw draft and untouched tokens on field repair", () => {
    let state = initialState("80\t09-17 * * 1-5", "UTC", now);
    state = appReducer(state, { type: "field", index: 0, token: "15", now });
    expect(state.raw).toBe("15 09-17 * * 1-5");
    state = appReducer(state, { type: "raw", raw: "  20 09-17 * * 1-5 ", now });
    expect(state.raw).toBe("  20 09-17 * * 1-5 ");
  });
  it("refuses ambiguous repair and keeps an empty picker incomplete", () => {
    let state = initialState("* *", "UTC", now);
    expect(
      appReducer(state, { type: "field", index: 0, token: "15", now }),
    ).toBe(state);
    state = initialState("* * * * *", "UTC", now);
    state = appReducer(state, { type: "field", index: 0, token: "", now });
    expect(state.validation.model).toBeNull();
    expect(state.validation.tokens).toEqual(["", "*", "*", "*", "*"]);
    state = appReducer(state, { type: "field", index: 0, token: "15", now });
    expect(state.validation.model?.expression).toBe("15 * * * *");
  });
  it("invalidates previews immediately and rejects stale or mismatched responses", () => {
    let state = initialState("0 * * * *", "UTC", now);
    const result = calculateSchedule({
      expression: state.raw,
      revision: 1,
      reference: now,
      zone: "UTC",
    });
    state = appReducer(state, { type: "result", result });
    expect(state.preview).toEqual(result);
    state = appReducer(state, { type: "raw", raw: "80 * * * *", now });
    expect(state.preview).toBeNull();
    expect(appReducer(state, { type: "result", result })).toBe(state);
    state = appReducer(state, { type: "restore", raw: "0 * * * *", now });
    expect(
      appReducer(state, {
        type: "result",
        result: { ...result, revision: state.revision, zone: "Asia/Riyadh" },
      }),
    ).toBe(state);
    expect(
      appReducer(state, { type: "error", revision: 1, message: "old error" }),
    ).toBe(state);
  });
});
it("preserves incomplete interval drafts through other field edits until explicitly repaired", () => {
  let state = initialState("*/15 9-17 * * 1-5", "UTC", now);
  state = appReducer(state, {
    type: "field",
    index: 0,
    token: "*/15",
    error: "Step is required.",
    interval: { start: "0", step: "" },
    now,
  });
  state = appReducer(state, { type: "field", index: 1, token: "12", now });
  expect(state.validation.model).toBeNull();
  expect(state.intervalDrafts[0]?.step).toBe("");
  expect(state.validation.issues[0].field).toBe("minute");
  state = appReducer(state, {
    type: "field",
    index: 0,
    token: "*/5",
    interval: { start: "0", step: "5" },
    now,
  });
  expect(state.validation.model?.expression).toBe("*/5 12 * * 1-5");
});
