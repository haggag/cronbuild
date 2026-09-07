import { useState, type KeyboardEvent } from "react";
import { FIELDS } from "../domain/cron/grammar";
import {
  intervalToken,
  projectField,
  serializeSelection,
} from "../domain/cron/builderProjection";
import type { WorkspaceState, Action } from "../app/appReducer";
import { Tabs } from "./Tabs";
const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function valueLabel(index: number, n: number) {
  return index === 3
    ? MONTHS[n - 1]
    : index === 4
      ? DAYS[n]
      : index === 1
        ? `${n % 12 || 12} ${n < 12 ? "AM" : "PM"}`
        : String(n).padStart(index === 0 ? 2 : 1, "0");
}
export function Builder({
  state,
  dispatch,
}: {
  state: WorkspaceState;
  dispatch: (action: Action) => void;
}) {
  const index = state.activeField,
    field = FIELDS[index];
  const projection = projectField(state.validation.fields[index], index);
  const [specificEdit, setSpecificEdit] = useState<{
    index: number;
    revision: number;
  } | null>(null);
  const localDraft = state.intervalDrafts?.[index];
  const start = localDraft?.start ?? projection.start,
    step = localDraft?.step ?? projection.step;
  const mode = localDraft
    ? "interval"
    : specificEdit?.index === index && specificEdit.revision === state.revision
      ? "specific"
      : projection.mode;
  const disabled = state.validation.tokens.length !== 5;
  // This helper runs only from input event handlers.
  function edit(
    token: string,
    error?: string,
    interval?: { start: string; step: string },
  ) {
    // oxlint-disable-next-line react/purity -- Called from event handlers, not render.
    dispatch({ type: "field", index, token, error, interval, now: Date.now() });
  }
  function editSelection(selected: number[]) {
    setSpecificEdit({ index, revision: state.revision + 1 });
    edit(serializeSelection(selected));
  }
  const setInterval = (x: string, n: string) => {
    const token = intervalToken(index, x, n);
    edit(
      token ?? state.validation.tokens[index] ?? "*",
      token === null
        ? `Enter a start from ${field.min}–${field.max} and a step from 1–${field.max - field.min + 1}.`
        : undefined,
      { start: x, step: n },
    );
  };
  const chooseMode = (next: string) => {
    if (next === "every") edit("*");
    if (next === "specific") editSelection(projection.values);
    if (next === "interval")
      setInterval(
        String(projection.values[0] ?? field.min),
        projection.mode === "interval" ? projection.step : "1",
      );
  };
  const values = Array.from(
    { length: field.max - field.min + 1 },
    (_, i) => i + field.min,
  );
  const toggle = (n: number) => {
    editSelection(
      projection.values.includes(n)
        ? projection.values.filter((v) => v !== n)
        : [...projection.values, n],
    );
  };
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, n: number) => {
    const columns =
      index === 0
        ? matchMedia("(max-width: 540px)").matches
          ? 5
          : 10
        : index === 2
          ? 7
          : index === 1
            ? matchMedia("(max-width: 540px)").matches
              ? 4
              : 6
            : matchMedia("(max-width: 540px)").matches
              ? 3
              : 4;
    const target =
      event.key === "ArrowRight"
        ? n + 1
        : event.key === "ArrowLeft"
          ? n - 1
          : event.key === "ArrowDown"
            ? n + columns
            : event.key === "ArrowUp"
              ? n - columns
              : event.key === "Home"
                ? field.min
                : event.key === "End"
                  ? field.max
                  : null;
    if (target !== null) {
      event.preventDefault();
      document
        .getElementById(
          `value-${index}-${Math.max(field.min, Math.min(field.max, target))}`,
        )
        ?.focus();
    }
  };
  return (
    <section className="panel builder" aria-labelledby="builder-title">
      <div className="section-heading">
        <h2 id="builder-title">Build your schedule</h2>
        <span className="eyebrow">01 / CONFIGURE</span>
      </div>
      <Tabs
        id="builder"
        labels={FIELDS.map((f) => f.label)}
        selected={index}
        onSelect={(i) => dispatch({ type: "tab", index: i })}
        label="Cron field"
      />
      <div
        id="builder-panel"
        role="tabpanel"
        aria-labelledby={`builder-tab-${index}`}
      >
        {disabled ? (
          <div className="notice">
            Restore five recognizable fields to use the builder.{" "}
            <button
              onClick={() =>
                dispatch({
                  type: "restore",
                  raw: state.lastValid,
                  now: Date.now(),
                })
              }
            >
              Restore last valid
            </button>
          </div>
        ) : (
          <>
            <fieldset className="mode-picker">
              <legend className="sr-only">{field.label} mode</legend>
              {["every", ...(index === 3 ? [] : ["interval"]), "specific"].map(
                (value) => (
                  <label
                    key={value}
                    className={
                      mode === value ||
                      (mode === "custom" && value === "specific")
                        ? "selected"
                        : ""
                    }
                  >
                    <input
                      type="radio"
                      name="field-mode"
                      checked={
                        mode === value ||
                        (mode === "custom" && value === "specific")
                      }
                      onChange={() => chooseMode(value)}
                    />
                    {value === "every"
                      ? `Every ${field.label.toLowerCase()}`
                      : value === "interval"
                        ? "At an interval"
                        : "Specific values"}
                  </label>
                ),
              )}
              {mode === "custom" && (
                <span className="badge">Custom syntax preserved</span>
              )}
            </fieldset>
            {mode === "every" ? (
              <div className="wildcard-info">
                <span className="wildcard-symbol">*</span>
                <div>
                  <strong>Every {field.label.toLowerCase()} is selected</strong>
                  <p>
                    All values from {field.min} to {field.max}. Other fields
                    still constrain when your schedule runs.
                  </p>
                </div>
              </div>
            ) : mode === "interval" ? (
              <div className="interval-controls">
                <label>
                  Every{" "}
                  <input
                    type="number"
                    min="1"
                    max={field.max - field.min + 1}
                    value={step}
                    onChange={(e) => setInterval(start, e.target.value)}
                    aria-label={`Interval in ${field.unit}`}
                  />{" "}
                  {field.unit}
                </label>
                <label>
                  Starting at{" "}
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={start}
                    onChange={(e) => setInterval(e.target.value, step)}
                    aria-label={`${field.label} interval start`}
                  />
                </label>
                <p>
                  Steps restart at each field boundary. They select values,
                  rather than elapsed time.
                  {index === 4 && " Sunday = 0; Saturday = 6."}
                </p>
              </div>
            ) : (
              <>
                <div className="picker-tools">
                  <p>
                    {projection.values.length} of {values.length} selected
                  </p>
                  <div>
                    {index === 4 && (
                      <>
                        <button onClick={() => edit("1-5")}>Weekdays</button>
                        <button onClick={() => edit("0,6")}>Weekends</button>
                      </>
                    )}
                    <button onClick={() => editSelection(values)}>
                      Select all
                    </button>
                    <button onClick={() => editSelection([])}>Clear</button>
                  </div>
                </div>
                <div
                  className={`value-grid field-${index}`}
                  aria-label={`${field.label} values`}
                >
                  {values.map((n) =>
                    index === 4 ? (
                      <label
                        key={n}
                        className={`day-option ${projection.values.includes(n) ? "selected" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={projection.values.includes(n)}
                          onChange={() => toggle(n)}
                        />
                        {valueLabel(index, n)}
                      </label>
                    ) : (
                      <button
                        key={n}
                        id={`value-${index}-${n}`}
                        type="button"
                        aria-pressed={projection.values.includes(n)}
                        aria-label={`${field.label} ${valueLabel(index, n)}`}
                        tabIndex={
                          n === (projection.values[0] ?? field.min) ? 0 : -1
                        }
                        onKeyDown={(e) => navigate(e, n)}
                        onClick={() => toggle(n)}
                      >
                        {valueLabel(index, n)}
                      </button>
                    ),
                  )}
                </div>
                <p className="helper">
                  {index === 4
                    ? "Select the weekdays when your schedule should run."
                    : "Use arrow keys to move and Space to toggle a value."}
                  {index === 2 &&
                    " Dates that do not exist in a month are skipped."}
                </p>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
