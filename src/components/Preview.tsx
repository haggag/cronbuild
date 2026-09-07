import { RefreshCw } from "lucide-react";
import type { WorkspaceState } from "../app/appReducer";
import { formatTimestamp, relativeTime } from "../domain/time/schedule";
export function Preview({
  state,
  onRefresh,
  mode,
  local,
  onTimezone,
}: {
  state: WorkspaceState;
  onRefresh: () => void;
  mode: "local" | "utc";
  local: string;
  onTimezone: (mode: "local" | "utc") => void;
}) {
  const result = state.preview;
  const status = !state.validation.model
    ? "Complete a valid expression to see its schedule."
    : state.previewError
      ? state.previewError
      : !result
        ? "Calculating your schedule…"
        : `${result.total.toLocaleString()} runs this week`;
  return (
    <section className="panel preview" aria-labelledby="preview-title">
      <div className="section-heading">
        <h2 id="preview-title">Schedule preview</h2>
        <button
          className="icon-button"
          aria-label="Refresh preview"
          disabled={!state.validation.model}
          onClick={onRefresh}
        >
          <RefreshCw size={17} />
        </button>
      </div>
      <fieldset className="timezone">
        <legend>Interpret schedule in</legend>
        <label>
          <input
            type="radio"
            name="timezone"
            checked={mode === "local"}
            onChange={() => onTimezone("local")}
          />{" "}
          Local
        </label>
        <label>
          <input
            type="radio"
            name="timezone"
            checked={mode === "utc"}
            onChange={() => onTimezone("utc")}
          />{" "}
          UTC
        </label>
        <span>{mode === "local" ? local : "UTC"}</span>
      </fieldset>
      <div className="preview-status" role="status">
        {status}
        {state.previewError && (
          <button onClick={onRefresh}>Retry preview</button>
        )}
      </div>
      {result && (
        <>
          <div className="timeline-heading">
            <span>
              {result.dates[0]} — {result.dates[6]}
            </span>
            <span>
              <i className="legend-dot" /> Scheduled hour
            </span>
          </div>
          <div
            className="heatmap-scroll"
            tabIndex={0}
            role="region"
            aria-label="Weekly schedule heatmap; scroll horizontally for all hours"
          >
            <div className="heatmap" aria-hidden="true">
              <div className="heatmap-row hours">
                <span />
                {Array.from({ length: 24 }, (_, hour) => (
                  <span key={hour}>
                    {hour % 3 === 0 ? String(hour).padStart(2, "0") : ""}
                  </span>
                ))}
              </div>
              {result.counts.map((row, day) => (
                <div className="heatmap-row" key={result.dates[day]}>
                  <span className="day-label">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day]}{" "}
                    <small>{result.dates[day].slice(5)}</small>
                  </span>
                  {row.map((count, hour) => (
                    <div
                      key={hour}
                      data-testid={`heat-${day}-${hour}`}
                      data-count={count}
                      className={`heat-cell ${count ? "active" : ""} ${result.hourDurations[day][hour] !== 1 ? "dst" : ""}`}
                      title={`${result.dates[day]} ${String(hour).padStart(2, "0")}:00: ${count} runs${result.hourDurations[day][hour] === 0 ? "; skipped local hour" : result.hourDurations[day][hour] > 1 ? "; repeated local hour (combined)" : ""}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          {!result.total && (
            <p className="helper">
              No runs during this week. Future runs are listed below.
            </p>
          )}
          <details className="timeline-details">
            <summary>View hourly counts and daylight saving details</summary>
            <div className="table-scroll" tabIndex={0}>
              <table>
                <caption>
                  Schedule counts in {state.zone}. Repeated local hours are
                  combined.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Hour</th>
                    <th scope="col">Runs</th>
                    <th scope="col">Local time</th>
                  </tr>
                </thead>
                <tbody>
                  {result.counts.flatMap((row, day) =>
                    row.map((count, hour) => (
                      <tr key={`${day}-${hour}`}>
                        <th scope="row">{result.dates[day]}</th>
                        <td>{String(hour).padStart(2, "0")}:00</td>
                        <td>{count}</td>
                        <td>
                          {result.hourDurations[day][hour] === 0
                            ? "Skipped hour"
                            : result.hourDurations[day][hour] > 1
                              ? "Repeated hour"
                              : "Ordinary hour"}
                        </td>
                      </tr>
                    )),
                  )}
                </tbody>
              </table>
            </div>
          </details>
          <div className="next-heading">
            <h3>Next 5 runs</h3>
            <span className="badge">{state.zone}</span>
          </div>
          <ol className="next-runs">
            {result.runs.map((run, i) => (
              <li key={run}>
                <span className="run-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <time dateTime={new Date(run).toISOString()}>
                  {formatTimestamp(run, state.zone)}
                </time>
                <span>{relativeTime(run, result.reference)}</span>
              </li>
            ))}
          </ol>
          {result.runs.length < 5 && (
            <p className="notice">
              Only {result.runs.length} runs found before{" "}
              {formatTimestamp(result.horizon, state.zone)}.
            </p>
          )}
          <p className="helper">
            Calculated at {formatTimestamp(result.reference, state.zone)}.
            Relative times stay fixed until you refresh.
          </p>
        </>
      )}
    </section>
  );
}
