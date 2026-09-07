import { DateTime } from "luxon";
import { requireModel } from "../cron/grammar";
import { occurrenceStream } from "../cron/parserAdapter";
export const FORECAST_YEARS = 40;
export const TIMELINE_LIMIT = 12000;
export interface ScheduleRequest {
  revision: number;
  expression: string;
  zone: string;
  reference: number;
}
export interface ScheduleResult extends ScheduleRequest {
  runs: number[];
  horizon: number;
  weekStart: number;
  weekEnd: number;
  dates: string[];
  counts: number[][];
  hourDurations: number[][];
  total: number;
}
export function calculateSchedule(request: ScheduleRequest): ScheduleResult {
  const model = requireModel(request.expression);
  const now = DateTime.fromMillis(request.reference, { zone: request.zone });
  if (!now.isValid)
    throw new Error(
      "Timezone or reference time is unavailable. Choose UTC and retry.",
    );
  const start = now.startOf("week");
  const end = start.plus({ weeks: 1 });
  const horizon = now.plus({ years: FORECAST_YEARS }).toMillis();
  const next = occurrenceStream(
    model,
    request.zone,
    request.reference,
    horizon,
  );
  const runs: number[] = [];
  for (let i = 0; i < 5; i++) {
    const value = next();
    if (value === null) break;
    runs.push(value);
  }
  const dates = Array.from({ length: 7 }, (_, i) =>
    start.plus({ days: i }).toISODate()!,
  );
  const counts = dates.map(() => Array<number>(24).fill(0));
  const hourDurations = dates.map(() => Array<number>(24).fill(0));
  // Walk elapsed hours only to describe absent/repeated wall-clock hours, never to schedule jobs.
  for (let cursor = start; cursor < end; cursor = cursor.plus({ hours: 1 })) {
    const row = dates.indexOf(cursor.toISODate()!);
    hourDurations[row][cursor.hour]++;
  }
  const weekly = occurrenceStream(
    model,
    request.zone,
    start.toMillis() - 1,
    end.toMillis() - 1,
  );
  let total = 0;
  for (;;) {
    const occurrence = weekly();
    if (occurrence === null) break;
    if (++total > TIMELINE_LIMIT)
      throw new Error("Timeline limit reached. Narrow the schedule and retry.");
    const local = DateTime.fromMillis(occurrence, { zone: request.zone });
    const row = dates.indexOf(local.toISODate()!);
    if (row < 0) throw new Error("Occurrence outside the calendar window.");
    counts[row][local.hour]++;
  }
  return {
    ...request,
    runs,
    horizon,
    weekStart: start.toMillis(),
    weekEnd: end.toMillis(),
    dates,
    counts,
    hourDurations,
    total,
  };
}
export function formatTimestamp(timestamp: number, zone: string): string {
  return DateTime.fromMillis(timestamp, { zone }).toFormat(
    "yyyy-MM-dd HH:mm:ss ZZ",
  );
}
export function relativeTime(timestamp: number, reference: number): string {
  const minutes = (timestamp - reference) / 60000;
  if (minutes < 1) return "in less than a minute";
  if (minutes < 60) return `in ${Math.floor(minutes)} min`;
  if (minutes < 1440)
    return `in ${Math.floor(minutes / 60)}h ${Math.floor(minutes % 60)}m`;
  return `in ${Math.floor(minutes / 1440)} days`;
}
