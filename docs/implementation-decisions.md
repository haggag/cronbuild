# Implementation decisions

Date: 2026-09-07. Source: CronBuild implementation plan and BRD v1.0.

The supplied Vite React/TypeScript project and npm lockfile were retained. Oxlint remains the linter; Prettier handles formatting. This is a static client application intended for Cloudflare Pages, with no server, Pages Functions, runtime secrets, tracking, remote fonts, or service worker. The Sites skills were reviewed; the explicitly requested existing Vite/Cloudflare Pages architecture and the plan’s publishing boundary take precedence over a new Sites scaffold or deployment.

## Product decisions from the plan

| Issue                                 | Decision for this plan                                                                                                                                                                                                                     | Reason / relationship to BRD                                                                                                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| “POSIX” plus step syntax              | Describe the dialect as **five-field numeric cron with steps**. Accept the BRD operators, not every extension supported by dependencies.                                                                                                   | Avoid claiming universal compatibility across all cron implementations.                                                                                                                                                                                |
| Initial expression                    | `*/15 9-17 * * 1-5`; Minute tab; crontab export; Local timezone; dark theme                                                                                                                                                                | Uses the BRD's representative business schedule.                                                                                                                                                                                                       |
| Invalid or incomplete edits           | Preserve the raw draft and show its errors immediately. Keep the last valid expression internally, but do not present its forecast/exports as results for the draft.                                                                       | A partially typed string cannot have a valid synchronized schedule.                                                                                                                                                                                    |
| “Within one render cycle”             | Update draft, pills, builder projection, validation, description, and valid hash in the same interaction commit. Invalidate old computed results immediately; calculate forecast/heatmap in a worker and accept only the current revision. | **Proposed amendment to AC1:** completed asynchronous forecasts cannot literally arrive in that render. Target ≤250 ms for normal inputs on the documented reference device. Do not claim literal AC1 compliance without acknowledging this amendment. |
| Heatmap's dates                       | Show the current calendar week, Monday 00:00 through next Monday 00:00, in the selected timezone. Print its date range.                                                                                                                    | Month/DOM constraints make an undated recurring “typical week” inaccurate. No week navigation is added.                                                                                                                                                |
| Timezone toggle                       | Interpret the expression in Local or UTC; recompute instants and the heatmap. This is not merely a timestamp display conversion.                                                                                                           | Gives the timezone selection a single meaning across forecast, summary context, and exports.                                                                                                                                                           |
| Share scope                           | Share the five expression tokens only, exactly as the BRD hash specifies. Theme, selected tabs, timezone preference, and computed timestamps are not encoded.                                                                              | Clarification of “full expression state.” A recipient's timezone/clock can change the preview; explain this beside Share.                                                                                                                              |
| Syntax the GUI cannot encode directly | Preserve raw syntax and display its expanded selection plus a Custom indicator. Change that field only when the user edits it.                                                                                                             | Ranges and mixed list/step forms exceed the three GUI modes.                                                                                                                                                                                           |
| Empty “Specific” selection            | Keep an incomplete field draft and show “Select at least one …”. Do not silently turn an empty selection into `*`.                                                                                                                         | “Clear” must not unexpectedly schedule every minute/day.                                                                                                                                                                                               |
| Very sparse or impossible schedules   | Separate grammar errors, provably impossible calendar combinations, an empty displayed week, and a bounded forecast failure.                                                                                                               | No-result conditions have different meanings and recovery paths.                                                                                                                                                                                       |
| Export portability                    | Preserve source spelling when safe. For dialect-sensitive day-of-week steps, use an explicitly bounded equivalent expression in exports and show that equivalent spelling.                                                                 | **Clarification to AC5:** equivalent schedule semantics take precedence over byte-for-byte snippet equality for this edge case; see section 4.3.                                                                                                       |
| Accessibility scope                   | Implement accessible patterns and AA-level contrast as engineering requirements; do not claim a completed WCAG certification/audit.                                                                                                        | Preserves the BRD's formal-audit boundary.                                                                                                                                                                                                             |
| “Single-screen” on small displays     | One page, with natural vertical scrolling on mobile and at zoom.                                                                                                                                                                           | Keeping everything above the fold must not shrink controls or clip content.                                                                                                                                                                            |

## Implementation choices

- Validation uses a bounded tokenizer with structured issues. Authored spelling stays separate from parsed value sets and export-safe spelling.
- Execution compiles deduplicated values and retains literal wildcard flags. Combined restricted day fields use a sorted, deduplicated union of DOM and DOW parser streams. Impossible DOM/month branches are omitted; they cannot suppress valid weekday runs.
- Long GUI selections use consecutive ranges when a comma list would exceed the 128-character token limit. They never become `*`. The builder retains Specific mode for that interaction; raw ranges remain Custom until edited.
- Worker calculation is limited to five forecast results over 40 calendar years and 12,000 weekly occurrences, with a two-second watchdog. Idle workers are reused. An in-flight obsolete worker is terminated. Reducer response acceptance checks revision, expression, timezone, and captured clock.
- Empty picker selections and incomplete interval inputs block generated output. They remain repairable in the builder. Wrong field counts require a full restore rather than guessed field positions.
- Timeline uses Luxon calendar boundaries, real occurrence counts, dated rows, and an accessible hourly table. DST information is displayed separately from run counts.
- Only English cronstrue is imported. Both restricted day fields receive explicit OR wording. Description failure produces a safe fallback rather than invalidating valid cron.
- Hash history uses replaceState; recent history is not a startup override. The default remains `*/15 9-17 * * 1-5`. Theme defaults to dark and initializes from a same-origin head script.
- Clear history suppresses any pending autosave of the just-cleared expression. A subsequent different expression resumes normal persistence; explicit restore, Enter, blur, or copy can save the same expression again. Storage events can update history/preferences without replacing a typed draft. A theme-only event preserves the captured forecast clock.
- GitHub Actions exports include current documented `timezone`; Kubernetes exports include `spec.timeZone` and a complete example pod template. Crontab explains the environment timezone requirement. Minimum-interval warnings include provable cross-midnight gaps using a bounded Gregorian calendar cycle; this diagnostic does not calculate timezone execution. Minimum-interval uncertainty is disclosed rather than declared compatible.
- Exported snippets are strings rendered through React spans. Clipboard success is announced only after resolution; failure exposes selectable text. AI snippet copy waits for a completed or failed preview.

## Pinned DST fixtures

cron-parser 5.10.0 in America/New_York:

- Spring 2026 hourly week has 167 runs. A daily 02:30 schedule runs at 03:30 on March 8 (`2026-03-08T07:30:00Z`).
- Fall 2026 hourly week has 169 runs, including two runs in the shared 01:00 cell. A fixed daily 01:30 schedule uses the first instance on November 1 (`2026-11-01T05:30:00Z`) and does not run twice.
- These are preview-engine behaviors, not universal promises about deployment targets.

## Actual runtime and dependency versions

Node 24.20.0; npm 11.19.0. `.nvmrc`, package engine, CI, and Pages instructions select Node 24.

- @tailwindcss/vite: 4.3.3
- cron-parser: 5.10.0
- cronstrue: 3.24.0
- lucide-react: 1.42.0
- luxon: 3.7.2
- react: 19.2.8
- react-dom: 19.2.8
- tailwindcss: 4.3.3
- @axe-core/playwright: 4.13.0
- @playwright/test: 1.63.0
- @testing-library/jest-dom: 7.0.1
- @testing-library/react: 16.3.3
- @testing-library/user-event: 14.6.7
- @types/luxon: 3.7.5
- @types/node: 24.13.3
- @types/react: 19.2.18
- @types/react-dom: 19.2.7
- @vitejs/plugin-react: 6.1.1
- chrome-launcher: 1.2.1
- jsdom: 30.0.1
- lighthouse: 13.4.1
- oxlint: 1.82.0
- prettier: 3.9.6
- typescript: 6.0.3
- vite: 8.2.2
- vitest: 5.0.0
- yaml: 2.9.0
