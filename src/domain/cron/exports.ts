import type { CronModel } from "./grammar";
import { describe } from "./description";
import { formatTimestamp, type ScheduleResult } from "../time/schedule";
export const EXPORT_TABS = [
  "crontab",
  "GitHub Actions",
  "Kubernetes",
  "AI Prompt",
] as const;
export type ExportTab = (typeof EXPORT_TABS)[number];
export function buildExport(
  tab: ExportTab,
  model: CronModel,
  zone: string,
  preview: ScheduleResult | null,
): string {
  const cron = model.safeExpression;
  switch (tab) {
    case "crontab":
      return `${cron} /path/to/script.sh`;
    case "GitHub Actions":
      return `on:\n  schedule:\n    - cron: '${cron}'\n      timezone: '${zone}'`;
    case "Kubernetes":
      return `apiVersion: batch/v1\nkind: CronJob\nmetadata:\n  name: scheduled-job\nspec:\n  schedule: "${cron}"\n  timeZone: "${zone}"\n  concurrencyPolicy: Forbid\n  jobTemplate:\n    spec:\n      template:\n        spec:\n          containers:\n            - name: task\n              image: busybox:1.37\n              command: ["/bin/sh", "-c", "echo Replace with your task"]\n          restartPolicy: OnFailure`;
    case "AI Prompt":
      return `Implement a background task in [language/framework] running on this schedule:\n- Cron Expression: \`${cron}\`\n- Description: ${describe(model)}\n- Timezone: ${zone}\n- Next run: ${preview?.runs[0] ? formatTimestamp(preview.runs[0], zone) : "unavailable"}\nRequirements: Ensure idempotency, timezone safety, and proper graceful shutdown handling.\nVerify the chosen scheduler's cron dialect and DST behavior.`;
  }
}
export function actionsWarning(model: CronModel): string {
  const minutes = model.fields[0].values;
  const hours = model.fields[1].values;
  const withinHour = minutes.some((m, i) => i > 0 && m - minutes[i - 1] < 5);
  const adjacentHour = hours.some((h, i) => i > 0 && h - hours[i - 1] === 1);
  const wrapGap = 60 - minutes[minutes.length - 1] + minutes[0];
  const acrossMidnight =
    wrapGap < 5 &&
    hours.includes(0) &&
    hours.includes(23) &&
    hasConsecutiveDates(model);
  if (withinHour || (adjacentHour && wrapGap < 5) || acrossMidnight)
    return "This schedule can run less than five minutes apart. GitHub Actions requires at least five minutes between runs.";
  return "GitHub Actions requires at least five minutes between runs. Scheduled execution may be delayed; target DST behavior can differ from this preview.";
}

// Calendar-only diagnostic, not a second timezone execution engine. Gregorian dates
// and weekdays repeat every 400 years, so this finite cycle proves whether any
// consecutive dates satisfy the product's month AND (DOM OR DOW) semantics.
function hasConsecutiveDates(model: CronModel): boolean {
  const months = new Set(model.fields[3].values);
  const dates = new Set(model.fields[2].values);
  const weekdays = new Set(model.fields[4].values);
  const matches = (month: number, day: number, weekday: number) =>
    months.has(month) &&
    (model.fields[2].unrestricted
      ? weekdays.has(weekday)
      : model.fields[4].unrestricted
        ? dates.has(day)
        : dates.has(day) || weekdays.has(weekday));
  let previous = false;
  let weekday = 6; // 2000-01-01 was Saturday.
  for (let year = 2000; year < 2400; year++) {
    const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const lengths = [
      31,
      leap ? 29 : 28,
      31,
      30,
      31,
      30,
      31,
      31,
      30,
      31,
      30,
      31,
    ];
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= lengths[month - 1]; day++) {
        const current = matches(month, day, weekday);
        if (previous && current) return true;
        previous = current;
        weekday = (weekday + 1) % 7;
      }
    }
  }
  return previous && matches(1, 1, weekday); // Include the cycle boundary.
}
