# CronBuild guide

Build and preview schedules at [CronBuild](https://cronbuild.com/). This app computes times; it does not execute, deploy, or monitor jobs.

## Five-field numeric cron with steps

Fields are minute (0–59), hour (0–23), day of month (1–31), month (1–12), and day of week (0–6; Sunday is 0). Separate five fields with spaces or tabs. Operators are `*` (all), `,` (set union), ascending inclusive `-` ranges, and positive integer `/` steps. Leading zeroes are decimal and are preserved. Duplicate values never duplicate a run.

Examples:

- `*/15 09-17 * * 1-5`: [every 15 minutes in weekday business hours](https://cronbuild.com/#*%2F15_09-17_*_*_1-5).
- `0 2 * * 1-5`: [weekdays at 02:00](https://cronbuild.com/#0_2_*_*_1-5).
- `0 0 29 2 *`: [leap day](https://cronbuild.com/#0_0_29_2_*).

Steps restart at each field boundary. Minute `20/15` selects 20, 35, 50 each hour. Day-of-month `1/2` selects odd dates each month, not an elapsed 48-hour interval. Large raw steps are valid: minute `*/100` selects only minute zero. The visual interval controls limit steps to the field span.

Names, macros, six/seven fields, seconds, years, Sunday 7, wraparound ranges, `?`, `L`, `W`, `#`, `H`, signed/decimal values, commands, and line breaks are unsupported. Use a list for wraparound selections. Safeguards: raw input at most 512 characters, each token at most 128, hash at most 2,048, and positive safe integer steps. Oversize input is rejected, never truncated.

## Day fields and calendars

When both day of month and day of week are restricted, they combine with **OR**. Month remains an AND constraint. `0 0 1 * 1` runs on the first of the month and every Monday. `0 0 31 2 1` runs on Mondays in February even though February 31 does not exist. `0 0 31 2 *` is impossible and is rejected.

Only the exact token `*` is unrestricted. Explicit full ranges and wildcard steps remain restricted. `0 0 1-31 * 1` therefore runs daily, while `0 0 * * 1` runs on Mondays. This wildcard-step rule differs across cron implementations: verify the target scheduler.

Weekday `1/2` means Monday, Wednesday, Friday. It is exported as `1-6/2` to avoid a parser's Sunday=7 extension. Restricted wildcard day steps are also bounded explicitly in exports. The app shows the equivalent expression. Raw-input copy preserves the exact authored draft; pill copy uses the equivalent safe expression.

## Timezones and previews

Local auto-detects the browser's IANA timezone. UTC reinterprets the schedule, changing scheduled instants; it is not just a display conversion. The next five runs are strictly after the captured calculation time. The timeline is the current Monday-to-Sunday calendar week in the selected zone, with all runs counted, not just the next five.

Preview engine: cron-parser 5.10.0. DST follows this engine and can differ from your target scheduler. Repeated hours combine in one grid cell; the hourly table identifies skipped/repeated hours. The absolute next-run timestamps include offsets. Use Refresh preview to update the captured clock and static relative labels.

Computation runs in a cancellable Web Worker, with a two-second watchdog, a 40-calendar-year forecast horizon, and a 12,000-occurrence weekly limit. A timeout or horizon exhaustion is not proof that the schedule never runs. Retry failures; valid cron/YAML exports remain available when a forecast fails. Invalid drafts immediately hide generated results.

## Exports

Crontab includes a placeholder command. Set the timezone in your cron environment; the expression itself does not configure it. GitHub Actions provides an `on.schedule` fragment with an explicit IANA timezone; add workflow jobs and respect its minimum five-minute frequency. Kubernetes supplies a complete example CronJob with `spec.timeZone`; replace the sample image and command. `Forbid` skips new jobs while a previous run is active. The AI prompt includes the expression, description, timezone, and current preview's next run; fill in the language/framework.

All snippets are examples. Cron dialects, scheduling delays, day-field interpretation, and DST behavior can vary by deployment target.

## Links, history, and privacy

A link has five underscore-separated tokens after `#`: `https://cronbuild.com/#0_2_*_*_1-5`. Encode each token once with `encodeURIComponent`. Links share the expression only, not theme, timezone, or timestamps. The Share action uses the current deployment origin.

The last ten valid expressions and theme/timezone preference are saved in namespaced browser localStorage. Recent expressions never override a link or the initial default. Raw edits save after 600 ms of inactivity or on blur, Enter, and copy; preset/history selections save immediately. Clear history supports Undo. Storage failure falls back to session memory.

No application tracking, third-party runtime requests, external fonts, accounts, API keys, or scheduler backend. Hosting still receives asset requests. No service worker is installed; offline reload is not guaranteed. Clipboard access requires a compatible secure browser context; when denied, use the selectable manual-copy text.

## Keyboard access

Ctrl+K or Cmd+K opens presets. Search, use Up/Down and Enter to select, or Escape to close. Field and export tabs use Left/Right and Home/End. Numeric pickers use arrow keys and Space. Weekdays use native checkboxes. A complete hourly-count table accompanies the visual heatmap. Reduced-motion preferences are respected.
