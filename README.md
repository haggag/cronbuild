# CronBuild

A responsive visual builder for five-field numeric cron with steps. Edit raw text or any of five field pickers, search ten presets, inspect a dated weekly heatmap and the next five runs, switch Local/UTC interpretation, and copy crontab, GitHub Actions, Kubernetes, or AI snippets. Shareable hash links restore without local state.

All application computation runs in the browser. There are no application servers, accounts, API keys, analytics, third-party runtime requests, remote fonts, or service workers. This tool previews schedules; it does not execute jobs.

## Local development

Use Node **24.20.0**, as pinned in `.nvmrc`, and npm. Dependencies are locked in `package-lock.json`.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. `npm run build` creates the static `dist/` artifact. `npm run preview` serves that built artifact locally; it is not a production server.

## Checks

```sh
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run build
npm exec playwright install chromium firefox webkit
npm run test:e2e
npm run audit:performance
npm audit
```

On Linux CI, install browsers with `npm exec playwright install --with-deps chromium firefox webkit`. Browser tests start a production preview server automatically. Chromium runs the complete suite; Firefox and WebKit run core smoke journeys. Failure screenshots/traces and responsive screenshots are written to `test-results/`; the HTML report is in `playwright-report/`.

`audit:performance` starts a separate built preview, runs three mobile Lighthouse audits, writes reports under `test-results/lighthouse/`, and checks median performance ≥90, accessibility ≥95, LCP ≤2.5 seconds, and CLS ≤0.1. It needs an installed Playwright Chromium binary and permission to start a browser/local server. Performance results describe the measured lab environment, not field performance.

GitHub Actions runs clean-install, type, lint, format, domain, build, browser, Lighthouse, and advisory checks, retaining failure artifacts. No deployment runs automatically. See [validation results](docs/validation-results.md) for checks actually executed here; a workflow file is not evidence of a remote CI run.

## Dialect and scheduling

Fields: minute 0–59, hour 0–23, day of month 1–31, month 1–12, weekday 0–6 (Sunday=0). Operators: `*`, lists, ascending inclusive ranges, and positive steps. Numeric leading zeroes retain their authored spelling. Six/seven fields, names, macros, Sunday 7, commands, and Quartz extensions are rejected.

Only a literal `*` makes a day field unrestricted. Two restricted day fields use OR, with month remaining an AND condition. The adapter preserves this distinction, including explicit full ranges and wildcard steps. Weekday steps are bounded through 6 in exports. These documented dialect choices are not universal scheduler guarantees.

Local/UTC changes schedule interpretation. Forecasts use cron-parser 5.10.0 timezone/DST behavior, with Luxon calendar-week boundaries. Timestamps include offsets, and the hourly table distinguishes repeated/skipped local hours. Relative labels use a captured clock; Refresh preview updates it. Workers are revision-checked, cancellable, and bounded by a two-second watchdog, a 40-year forecast horizon, and 12,000 weekly occurrences.

The plan’s AC1 clarification is explicit: input, validation, controls, summary, and hash synchronize immediately, while the preview becomes pending and resolves asynchronously. No literal one-render completion is claimed for a worker. AC5 preserves equivalent schedule semantics when export spelling needs explicit bounds.

Read the [public guide](public/cronbuild-guide.md) for detailed grammar, examples, target differences, and limits. AI assistants can discover [llms.txt](public/llms.txt).

## Persistence and sharing

Links encode exactly five authored tokens after `#`, separated by underscores. Share uses the current origin; canonical public documentation uses `https://cronbuild.com/`. Theme, timezone, and timestamps are not shared.

Namespaced localStorage holds the ten most recent valid expressions and explicit theme/timezone preferences. Raw edits save after 600 ms, on blur/Enter, and during copy/share. History never overrides the startup hash. Clear supports Undo, and storage failure falls back to session history. Cross-tab updates do not overwrite a typed draft.

## Cloudflare Pages

Connect this repository in Cloudflare Pages with the repository root as root directory, `npm run build` as build command, and `dist` as output directory. Select Node 24.20.0 (or `NODE_VERSION=24.20.0` in build settings). No Functions or runtime secrets are needed. Confirm the intended production branch and custom domain before publishing.

Static `_headers` supplies CSP and security/cache rules. Hashed assets are immutable; HTML and documentation revalidate. Vite preview does not apply Cloudflare `_headers`; HTTPS, actual response headers, content types, and secure clipboard behavior must be verified on a deployed preview. See the [release checklist](docs/release-checklist.md) for preview validation and rollback. Publishing is a separate release step.

## Troubleshooting

- Invalid link or raw draft: read the field error, repair the field, choose a preset, or use Restore last valid / Use default.
- Preview failure: Retry or Refresh preview. Invalid calendar combinations are distinct from an empty week or bounded forecast failure. Crontab/YAML remain available if a valid schedule’s worker fails.
- Clipboard denied: select and copy the manual fallback text. Success toasts only follow successful writes.
- Theme/history unavailable: allow local storage if desired; the builder still works without it.
- Incompatible browser: use a current Chromium, Firefox, or Safari with module workers and Intl timezone support.

Architecture and actual dependency versions are recorded in [implementation decisions](docs/implementation-decisions.md). The original [implementation plan](docs/CronBuild_Implementation_Plan.md) and [BRD](docs/CronBuild_BRD_v1.0.md) remain the scope references.
