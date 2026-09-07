# CronBuild v1.0 — LLM Implementation Plan

**Source of requirements:** [CronBuild BRD v1.0](./CronBuild_BRD_v1.0.md)

**Planning date:** 2026-09-07

**Starting point:** The latest stable Vite `react-ts` template will already be scaffolded.

**Deliverable:** A production-ready, responsive, static browser application deployed through Cloudflare Pages. This document plans the implementation; it does not implement or deploy the app.

## 1. Product interpretation and scope

Build a single workspace where developers can author a five-field cron expression visually or as text, understand its meaning, inspect when it runs, and copy an expression, integration snippet, or shareable preview link. The application computes schedules; it does not execute jobs.

All application logic runs in the browser. Ship only static HTML, CSS, JavaScript, and public assets. There are no application servers, API routes, Cloudflare Pages Functions, accounts, API keys, analytics, remote fonts, or runtime CDN dependencies. A browser Web Worker is compatible with this architecture and is distinct from a Cloudflare Worker.

Implement every MVP feature in BRD sections 2–4 and all seven acceptance criteria in section 6. Keep six/seven-field cron, natural-language authoring, on-device AI, extra export targets, cloud persistence, comparison, PWA/service-worker support, and additional calendar views out of this release.

“Production-ready” adds correct error handling, accessible operation, repeatable builds, browser testing, performance limits, security headers, and release documentation. It does not expand the product into a scheduler service or imply that a formal accessibility audit has occurred.

### 1.1 Requirement traceability

Use these IDs in implementation tasks and acceptance tests.

| ID | BRD reference | Required result | Primary delivery tasks | Verification |
| --- | --- | --- | --- | --- |
| R01 | 2; 3.1 | Responsive workspace; dark default; persistent light toggle | T03, T10 | Desktop/mobile visual checks; reload theme test |
| R02 | 3.2–3.3; 3.6; AC1 | Five interactive pills; field transitions; bidirectional synchronization | T02–T04 | Raw/GUI/cursor and changed-pill tests |
| R03 | 3.5; 4.1; AC2 | Exactly five supported fields; actionable, field-specific errors | T01, T02, T04 | Grammar fixtures; invalid-input browser flow |
| R04 | 4.2 | All five builders, field modes, grids, and weekday shortcuts | T04 | Per-field interaction matrix |
| R05 | 4.3; AC3 | Ten searchable presets; button and keyboard access | T05 | Preset selection and keyboard tests |
| R06 | 4.4; AC6 | Actual 7-day × 24-hour schedule heatmap | T06 | Fixed-week occurrence fixtures; DST tests |
| R07 | 4.5 | Next five runs; Local/UTC; static relative labels | T06 | Fixed-clock UTC/local/leap-year tests |
| R08 | 3.4; 4.6; AC5 | Four highlighted exports; accurate copy feedback | T07 | Export fixtures; clipboard success/failure tests |
| R09 | 4.7; AC4 | Hash restore/share; last ten valid expressions | T08 | Fresh-context restore; storage failure/history tests |
| R10 | 4.8; AC7 | Static, accurate `/llms.txt` and working examples | T09 | Production asset and example round-trip tests |
| R11 | Overview; 5 | Client-only operation; zero application tracking | T00, T09, T11 | Static artifact/network/security inspection |
| R12 | 5 accessibility | Semantic HTML and complete keyboard access | T03–T10 | Automated checks plus keyboard/screen-reader review |

## 2. Decisions that fill BRD gaps

These are the recommended implementation defaults. They distinguish requirements analysis from verbatim BRD requirements. Preserve them in `docs/implementation-decisions.md` when implementation starts; record any replacement decision and update its tests together.

| Issue | Decision for this plan | Reason / relationship to BRD |
| --- | --- | --- |
| “POSIX” plus step syntax | Describe the dialect as **five-field numeric cron with steps**. Accept the BRD operators, not every extension supported by dependencies. | Avoid claiming universal compatibility across all cron implementations. |
| Initial expression | `*/15 9-17 * * 1-5`; Minute tab; crontab export; Local timezone; dark theme | Uses the BRD's representative business schedule. |
| Invalid or incomplete edits | Preserve the raw draft and show its errors immediately. Keep the last valid expression internally, but do not present its forecast/exports as results for the draft. | A partially typed string cannot have a valid synchronized schedule. |
| “Within one render cycle” | Update draft, pills, builder projection, validation, description, and valid hash in the same interaction commit. Invalidate old computed results immediately; calculate forecast/heatmap in a worker and accept only the current revision. | **Proposed amendment to AC1:** completed asynchronous forecasts cannot literally arrive in that render. Target ≤250 ms for normal inputs on the documented reference device. Do not claim literal AC1 compliance without acknowledging this amendment. |
| Heatmap's dates | Show the current calendar week, Monday 00:00 through next Monday 00:00, in the selected timezone. Print its date range. | Month/DOM constraints make an undated recurring “typical week” inaccurate. No week navigation is added. |
| Timezone toggle | Interpret the expression in Local or UTC; recompute instants and the heatmap. This is not merely a timestamp display conversion. | Gives the timezone selection a single meaning across forecast, summary context, and exports. |
| Share scope | Share the five expression tokens only, exactly as the BRD hash specifies. Theme, selected tabs, timezone preference, and computed timestamps are not encoded. | Clarification of “full expression state.” A recipient's timezone/clock can change the preview; explain this beside Share. |
| Syntax the GUI cannot encode directly | Preserve raw syntax and display its expanded selection plus a Custom indicator. Change that field only when the user edits it. | Ranges and mixed list/step forms exceed the three GUI modes. |
| Empty “Specific” selection | Keep an incomplete field draft and show “Select at least one …”. Do not silently turn an empty selection into `*`. | “Clear” must not unexpectedly schedule every minute/day. |
| Very sparse or impossible schedules | Separate grammar errors, provably impossible calendar combinations, an empty displayed week, and a bounded forecast failure. | No-result conditions have different meanings and recovery paths. |
| Export portability | Preserve source spelling when safe. For dialect-sensitive day-of-week steps, use an explicitly bounded equivalent expression in exports and show that equivalent spelling. | **Clarification to AC5:** equivalent schedule semantics take precedence over byte-for-byte snippet equality for this edge case; see section 4.3. |
| Accessibility scope | Implement accessible patterns and AA-level contrast as engineering requirements; do not claim a completed WCAG certification/audit. | Preserves the BRD's formal-audit boundary. |
| “Single-screen” on small displays | One page, with natural vertical scrolling on mobile and at zoom. | Keeping everything above the fold must not shrink controls or clip content. |

The concrete GitHub Actions and Kubernetes timezone additions in section 8 deliberately improve on the abbreviated BRD examples. Do not copy those examples unchanged and then imply that they preserve Local-time scheduling.

## 3. Stack and project structure

### 3.1 Dependency policy

Inspect the supplied scaffold before changing it. Keep its supported React/TypeScript/Vite integration, strict TypeScript configuration, package manager, and lockfile. Resolve stable compatible packages at implementation time; record actual resolved versions and the Node runtime. Do not hard-code guessed “latest” version numbers into this plan or install floating dependencies during production builds.

| Layer | Choice | Implementation constraint |
| --- | --- | --- |
| UI | Scaffolded React + TypeScript | Function components; one domain reducer/controller; local ephemeral UI state |
| Styling | Tailwind CSS with its current Vite integration; CSS variables | Shared design tokens; complete static utility names; CSS-only transitions |
| Icons | `lucide-react` | Import only used icons; label icon-only controls |
| Cron execution | `cron-parser` | Isolate behind an adapter; no scheduler execution or filesystem APIs |
| Description | `cronstrue` | English import; validated input only; separate from execution validation |
| Calendar boundaries | A directly declared, compatible `luxon` dependency and types where required | Confine to timezone/date adapter; do not rely on a parser's undeclared transitive dependency |
| Unit/component tests | Vitest, React Testing Library, user-event, DOM matchers | Test behavior; use a DOM environment only for component tests |
| Browser tests | Playwright, with an accessibility integration such as axe | Exercise the built application with a real worker |
| Syntax highlighting | React spans from the known export template | No HTML injection, editor framework, or full highlighting bundle |
| Other infrastructure | Browser history, storage, clipboard, Intl, Web Worker | No router, global-state library, query client, animation or chart library |

Current Tailwind guidance uses `@tailwindcss/vite` and a CSS `@import "tailwindcss"`; retain the scaffold's React plugin alongside it. Do not paste a Tailwind v3 setup into a newer project. [Tailwind Vite installation](https://tailwindcss.com/docs/installation/using-vite)

Use an actively supported Node LTS that satisfies the installed build and test tools, and pin it consistently for local development, CI, and Pages. Vite and Vitest can have different minimum runtimes. A production build emits `dist`; `vite preview` is a local verification server. [Vite getting started](https://vite.dev/guide/), [Vite static deployment](https://vite.dev/guide/static-deploy), [Vitest getting started](https://vitest.dev/guide/)

Before writing library-specific code, use the repository's Context7 workflow: resolve the library ID, then query the installed version's relevant API. Planning checked Vite and cron-parser through Context7 and used official sources where documentation resolution was unavailable. Refresh the remaining dependency APIs during T00. Treat the linked current documentation as guidance; verify behavior against the exact installed versions.

### 3.2 Proposed layout

```text
src/
  app/
    App.tsx
    appReducer.ts
    useCronWorkspace.ts
    ErrorBoundary.tsx
  domain/cron/
    types.ts
    fields.ts
    grammar.ts
    validation.ts
    serialization.ts
    builderProjection.ts
    parserAdapter.ts
    description.ts
    presets.ts
    exports.ts
  domain/time/
    timezone.ts
    calendarWindow.ts
    formatting.ts
  workers/
    schedule.worker.ts
    protocol.ts
    scheduleClient.ts
  components/
    layout/                  # Header, workspace, cards
    cron/                    # PillBar, RawInput, Summary, ValidationMessage
    builder/                 # Tabs, modes, pickers, field-specific panels
    presets/                 # Searchable preset dialog/dropdown
    preview/                 # Timeline, accessible alternative, NextRuns
    exports/                 # ExportTabs, CodeBlock
    history/                 # RecentExpressions
    ui/                      # Button, Tabs, Tooltip, Toast, ThemeToggle
  infrastructure/
    hashState.ts
    storage.ts
    clipboard.ts
    theme.ts
  styles/
    index.css
    tokens.css
  test/
    fixtures/
    setup.ts
  main.tsx
public/
  llms.txt
  cronbuild-guide.md
  _headers
  robots.txt
  sitemap.xml
  favicon.svg
  theme-init.js
tests/e2e/
docs/
  implementation-decisions.md
  release-checklist.md
  validation-results.md
```

Keep pure tests beside their modules if that is the scaffold's convention. This tree establishes responsibilities, not a requirement for empty files or a component for every element. Keep dependency imports in adapters; UI components must not independently parse expressions or calculate occurrences.

## 4. Cron domain contract

### 4.1 Supported grammar and validation

Define field metadata once and reuse it for parsing, labels, inputs, error text, and tests.

| Field | Inclusive bounds | Wildcard | Interval GUI | Specific GUI |
| --- | --- | --- | --- | --- |
| Minute | 0–59 | `*` | Every N minutes from X | 60 cells, 10 columns × 6 rows on desktop |
| Hour | 0–23 | `*` | Every N hours from X | 24 cells with unambiguous AM/PM labels |
| Day of month | 1–31 | `*` | Every N date values from X | 31-cell calendar-style grid |
| Month | 1–12 | `*` | Not exposed; raw steps still supported | Jan–Dec toggles |
| Day of week | 0–6; Sunday=0 | `*` | Every N weekday values from X | Sun–Sat checkboxes and shortcuts |

Use a small bounded tokenizer/parser for the product dialect, not a single permissive regular expression and not the human-description library:

```text
expression := field whitespace field whitespace field whitespace field whitespace field
field      := item ("," item)*
item       := base ("/" positiveInteger)?
base       := "*" | integer | integer "-" integer
```

Validation rules:

- Require exactly five fields. Treat spaces/tabs as separators. Reject embedded line breaks, control characters, command suffixes, and non-ASCII cron punctuation; trim outer whitespace for parsing only.
- Accept numeric leading zeroes as decimal. Preserve authored token spelling. Ranges are inclusive and ascending; equal endpoints are allowed. Reject wraparound ranges and suggest a list instead.
- Validate every endpoint against its field bounds. Steps must be positive safe integers. Raw steps larger than the field span remain valid and may produce one value; explain this rather than inventing extra runs. Limit the GUI interval input to the field span.
- Support list/range/step combinations and overlapping lists as a set union. Preserve source spelling but deduplicate the adapter's numeric values so duplicate values do not depend on library quirks.
- Reject six/seven fields, `@daily` and other macros, month/day names, Sunday `7`, `?`, `L`, `W`, `#`, `H`, signs, decimals, missing operands, empty list members, and multiple slashes per item. Error messages should identify the unsupported feature or expected range.
- Cap raw input at 512 characters, each token at 128 characters, and the encoded hash at 2,048 characters. Reject oversize input with a readable error; never truncate it into a different valid schedule. Bound integer parsing and token expansion.
- Return structured issues containing a code, optional field ID, source span, message, and remedy. Render errors as text; do not expose stack traces or rely on matching library prose throughout the app.

These length limits are implementation safeguards, not new cron operators. Keep them as named constants and document them in the public guide.

### 4.2 Scheduling semantics

- Use zero seconds for five-field expressions. The next run is strictly later than the captured reference instant; an expression matching exactly “now” forecasts its following occurrence.
- A step operates within one field, restarting at that field's boundary. `20/15` in minutes selects 20, 35, and 50 each hour. `1/2` in DOM selects odd dates each month; it does not mean an elapsed 48-hour interval. Show this explanation next to interval controls.
- The DOM/DOW rule is OR when both are restricted; when either is `*`, the other constrains the date. Keep month as an AND constraint. Make the OR relationship visible when relevant.
- Preserve the distinction between literal `*` and an explicitly enumerated/full-range day field. Do not compact an explicit all-days selection into `*`, because that can change behavior when the other day field is restricted. Pin tests for wildcard-step variants as well.
- A nonexistent date in one month is skipped when another allowed month can match. Leap-day schedules are valid. Prove a globally impossible DOM/month combination from the calendar only when DOW cannot independently make it run.
- Use the pinned parser's timezone/DST behavior as the preview engine's behavior. Test it explicitly; do not promise every deployment target makes the same DST decisions.

The current parser entry point is `CronExpressionParser.parse(expression, options)`. Its `strict: true` mode requires six fields and disallows combined DOM/DOW, so it is not this product's validator. Use the app's five-field validation and the compatible non-strict adapter mode. [cron-parser configuration](https://github.com/harrisiirak/cron-parser/blob/master/_autodocs/configuration.md)

### 4.3 Parser and export adapter

Maintain three separate representations:

1. **Authored tokens:** the five strings visible in the raw editor/pills and serialized into the share hash.
2. **Parsed field model:** bounded value sets plus original syntax and wildcard semantics, used for GUI projection and diagnostics.
3. **Execution/export-safe expression:** a semantically equivalent expression used where a dependency or target interprets shorthand differently. Preserve the authored expression when no adaptation is necessary.

In particular, the parser allows DOW 0–7, and a numeric-base step expands to the parser's maximum. For the BRD's 0–6 builder semantics, `1/2` must mean Monday, Wednesday, Friday; compile it to `1-6/2`, not an implicit range through Sunday alias 7. Generate explicitly bounded DOW interval tokens from the GUI. Apply the same bounded equivalent to exports and the human-description input. Show “Equivalent cron: …” when export spelling differs, and make the pill-bar copy use that safe expression. The raw-input copy explicitly copies the authored text. [cron-parser field parsing source](https://github.com/harrisiirak/cron-parser/blob/master/src/CronExpressionParser.ts)

The product's day-field rule treats only the exact token `*` as unrestricted. A step such as `*/2` remains a restricted field; use an explicit bounded step for execution/export if a target would classify its leading wildcard differently. Deduplication and step adaptation must carry this restriction flag through the compiler. Add fixtures for DOM `*/2` combined with a weekday, and distinguish that from DOM `*` combined with the same weekday. State this dialect choice in the public guide; do not claim all cron implementations classify wildcard steps identically.

Pin independent expected-date fixtures for DOM/DOW combinations, explicit full ranges, and impossible dates. If the installed parser rejects an otherwise valid OR expression such as `0 0 31 2 1`, implement the adapter as a union of two parser streams: the feasible DOM branch with DOW `*`, and the DOW branch with DOM `*`. Merge timestamps in increasing order and deduplicate coincident runs. An impossible DOM branch contributes no dates; it must not suppress the DOW branch. The same adapter must serve both next runs and heatmap. Do not implement a second timezone scheduler in the UI or silently accept incorrect results.

### 4.4 Human-readable description

Use the default English `cronstrue` import, with explicit zero-based weekdays, one-based months, 24-hour formatting, and parse exceptions caught by the adapter. It supports a broader grammar than this product, so call it only after product validation. Its day-field wording option must preserve OR intent. [cRonstrue usage and options](https://github.com/bradymholt/cRonstrue)

Append the active timezone as separate context. Add a plain-language OR explanation where the library's wording could be misunderstood. Do not compare the BRD's illustrative English sentence byte-for-byte: for `*/15 9-17 * * 1-5`, the final actual run in each workday is 17:45, even if the hour window is described as ending at 17:59. Test the meaning against occurrences. A description failure should show a fallback message and leave a valid schedule usable.

## 5. State, synchronization, and editing

### 5.1 Single source of truth

Use one domain reducer for draft changes and valid commits. Model invalid state explicitly with a discriminated union. The following is a contract sketch, not final package-specific code:

```ts
type FieldId = 'minute' | 'hour' | 'dayOfMonth' | 'month' | 'dayOfWeek';
type CronTokens = readonly [string, string, string, string, string];
type TimezoneMode = 'local' | 'utc';

type ScheduleRevision = {
  id: number;
  authoredTokens: CronTokens;
  authoredExpression: string;
  executionExpression: string;
  timezone: string;
  referenceTimeMs: number;
};

type PreviewState =
  | { status: 'unavailable'; reason: 'invalid' | 'incomplete' }
  | { status: 'pending'; revisionId: number }
  | { status: 'ready'; revisionId: number; result: SchedulePreview }
  | { status: 'error'; revisionId: number; issue: PreviewIssue };
```

`SchedulePreview` contains numeric UTC instants for runs, the displayed week's boundaries/date labels, 168 heatmap cells with counts, and structured partial-result information. Do not put mutable parser iterators, React elements, formatted locale strings, or browser handles into domain state or worker messages.

Store only what must survive a render: raw draft, validation result, last valid model/revision, active field, incomplete GUI draft if present, timezone mode, theme, selected export tab, preset open/query state, recent expressions, and toast state. Derive builder selections, descriptions, changed-field IDs, copy availability, and snippets from those values. Avoid five independently synchronized field states plus another independently updated cron string.

Reducers remain pure; timestamps are action inputs. Storage writes, URL updates, worker commands, focus movement, and clipboard writes belong in the controller/effects, with cleanup and idempotence under React development Strict Mode. React's reducer guidance supports consolidating transitions; this particular state model is an application design decision. [React reducer guidance](https://react.dev/learn/extracting-state-logic-into-a-reducer)

### 5.2 Event behavior

| Event | Required transition |
| --- | --- |
| Raw keystroke | Store the exact draft, validate, and project parsable fields immediately. If valid, commit the new model/revision and invalidate old preview data. Do not replace the input's value with formatted output. |
| Raw composition | Preserve composition text; do not reformat, remount, or steal focus. Validate final composition normally. |
| GUI field edit | Serialize only that field and rebuild five tokens. Preserve untouched valid raw spellings. Revalidate the whole expression atomically. |
| Invalid raw input with five recognizable positions | GUI edits may repair the corresponding token while leaving other invalid tokens intact. |
| Wrong field count | Do not guess token positions. Keep navigation and preset/recent restore usable; show a Restore last valid action before editing ambiguous field positions. |
| Empty picker / incomplete numeric control | Retain a field-local incomplete draft, invalidate dependent outputs, and allow further editing. An empty set has no cron serialization. |
| Preset / recent / valid external hash | Replace all five fields as one transaction; discard incomplete field drafts; preserve theme, timezone, and active tabs. |
| Timezone switch | Keep expression text unchanged; create a revision using the new zone and a new reference instant. |
| Theme / tab / preset search | Change presentation only; do not reset forecast time or rewrite history. |
| Worker response | Accept only when revision ID and expression/zone/reference metadata match the active revision. |
| Invalid edit during worker execution | Cancel the obsolete request and prevent its response from repopulating results. |

Do not use a bidirectional chain of effects that serializes fields into raw input and then parses that raw input back into fields. Use a single command path that returns all synchronous projections together. Test editing the middle of the string and undo/redo while preserving selection and caret position.

### 5.3 GUI projection and mode changes

- `*` maps to Every. A single wildcard/numeric-base step, or a bounded step ending at the field maximum, maps to Interval where offered and within the GUI's bounds. This includes the DOW interval syntax generated by the GUI. A numeric list maps to Specific. Other valid combinations, including raw steps larger than the GUI allows, display the expanded values and a Custom indicator.
- For a raw range such as `9-17`, selecting the Hour tab must leave `9-17` intact. The first picker edit may serialize the new set as a sorted comma list. No lossy conversion occurs just from opening a tab.
- Switching to Every immediately writes `*`. Switching to Specific seeds the current expanded set. Switching to Interval seeds X from the current minimum, N from a recognized step or 1; show the resulting token immediately.
- For a Custom month step, display the selected months while preserving its raw step until the user toggles a month.
- Maintain incomplete step/start text as a UI draft rather than coercing `''` to zero. Provide bounds, labels, and inline messages. Never commit `NaN`, an empty token, or a zero step.
- Weekdays writes `1-5`; Weekends writes `0,6`. Clear clears the selected specific values and shows the incomplete-state message.
- Animate changed token text within a stable button. Keep each pill and raw input keyed by identity, not the changing expression, to preserve focus.

## 6. Interaction and visual design

Create a compact developer-tool workspace using a neutral dark background, slightly elevated panels, one accent color, distinct warning/error colors, monospace schedule/code text, and a system UI font for controls. Define semantic CSS variables for both themes before building individual panels. Color values must pass contrast checks; do not rely on aesthetic guesses.

Desktop order: header → pill bar → raw input and summary → full-width builder → two-column preview/export region → recent expressions. Place heatmap above next runs in the preview column. Maintain this same reading order in the DOM and on mobile.

- At approximately 1,024 px and above, use the two-column lower region and a centered maximum width around 1,280 px. At narrower widths, stack it. Let the pill row wrap; keep the raw expression input full width.
- At 320–390 px widths, use a readable picker arrangement rather than tiny cells. Restrict horizontal scrolling to the labeled heatmap/code containers; do not let the page body overflow.
- Use native inputs, buttons, fieldsets, legends, headings, and landmark elements. Add a skip link. Tooltips supplement persistent error text; hover must not be the only way to discover an error.
- Builder/export tabs support Left/Right, Home/End, selected state, labelled tabpanels, and predictable focus. Pills activate the corresponding tab and move focus to it. Follow the current accessible tab pattern. [WAI-ARIA tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)
- Make picker buttons expose selected state and accessible value labels. Use roving focus/arrow navigation for the 60-cell minute picker so it does not require sixty Tab presses. Maintain ordinary checkbox behavior for seven weekdays.
- The preset trigger opens a searchable popover/dialog. Focus search on open; search name, category, and expression; show a no-results state. Arrow keys move through results; Enter selects; Escape closes and returns focus. `Cmd+K`/`Ctrl+K` should prevent the browser default when handled, including from raw input.
- All copy buttons have contextual accessible names. A successful copy creates a polite `Copied!` status toast that dismisses after 2 seconds. Repeated copies replace/restart the toast rather than stacking it. Failure receives different, actionable feedback.
- Use approximately 150–200 ms text transitions and a short changed-field accent pulse. Animate opacity/transform only. Disable transitions and pulse animations under `prefers-reduced-motion`.
- Default to dark even if the OS prefers light. Restore an explicit saved theme before paint using a small same-origin head script compatible with the production CSP. Set `color-scheme`; storage failure leaves a usable dark default.
- Preview state must distinguish pending, invalid, no runs this week, partial forecast, and computation error. Announce a short update once, not 168 cell changes or every keystroke.

### 6.1 Exact preset catalog

| Category | Name | Expression |
| --- | --- | --- |
| Common | Every minute | `* * * * *` |
| Common | Every 5 minutes | `*/5 * * * *` |
| Common | Every 15 minutes | `*/15 * * * *` |
| Common | Hourly | `0 * * * *` |
| Common | Daily at midnight | `0 0 * * *` |
| Common | Weekly on Sunday at 3 AM | `0 3 * * 0` |
| Business | Weekdays at 9 AM | `0 9 * * 1-5` |
| Business | Twice daily, noon and midnight | `0 0,12 * * *` |
| Business | First of every month | `0 0 1 * *` |
| Business | Quarterly, Jan/Apr/Jul/Oct 1st | `0 0 1 1,4,7,10 *` |

Keep this as typed static data. Test every preset through the same validator, hash codec, description, forecast, and export pipeline as user input.

## 7. Forecast and heatmap computation

### 7.1 Time contract

Detect Local using `Intl.DateTimeFormat().resolvedOptions().timeZone`; validate the result and fall back to UTC with explanatory UI if detection fails. Persist the choice `local`/`utc`, not a hard-coded local zone copied from a different machine.

Pass the effective IANA zone explicitly into the adapter. Use epoch milliseconds for reference instants and worker results. Use timezone-aware calendar arithmetic for week boundaries and forecast horizons; do not parse unqualified date strings or assume seven local days always equal 168 elapsed hours.

Capture one `referenceTimeMs` per valid expression commit, timezone switch, initial load, or explicit Refresh preview action. Derive the relative labels and AI next-run context from that same snapshot. Print “Calculated at …” so static relative labels are not mistaken for a live countdown. Do not add a live interval; switching an export tab or theme must not change the calculation time.

### 7.2 Worker protocol and limits

Create a bundled module worker through Vite's documented `new Worker(new URL(..., import.meta.url), { type: 'module' })` pattern. Keep browser and worker TypeScript libraries scoped so ambient DOM/WebWorker declarations do not conflict. [Vite web workers](https://vite.dev/guide/features#web-workers)

Request: revision ID, validated model/execution expression, effective zone, reference instant, and named limits. Response: the same identity plus forecast/heatmap results or structured errors. Unit-test the pure calculation function directly, then browser-test the worker wrapper.

Set initial explicit limits:

- Forecast: five results; a 40-calendar-year search horizon; retain fewer results with a “Only N runs found before …” explanation if the horizon is exhausted. This accommodates ordinary leap-day forecasts without claiming the horizon proves universal absence.
- Timeline: the half-open interval `[weekStart, nextWeekStart)`; at most 12,000 emitted occurrences, enough for dense schedules in ordinary DST-transition weeks. If a limit is hit, return a partial/error state, not an apparently complete grid.
- Worker wall-clock watchdog: 2 seconds per request initially. Terminate and recreate a timed-out or obsolete worker; a queued cancel message cannot interrupt a tight synchronous computation. Keep at most one active request and the latest desired revision.
- UI performance goal: update editing feedback within one frame where practical; no application-generated main-thread task above 50 ms during representative editing. Measure normal preview completion separately, targeting p95 ≤250 ms on the recorded reference machine. Treat these numbers as measured release budgets, not claims already achieved.

Optimize only after measurements. A first implementation may enumerate each occurrence in the bounded week through `cron-parser`; it must not enumerate an unbounded schedule, derive the heatmap from only five runs, or scan every minute over decades. If dense iteration misses the target, optimize to bounded hour-window queries while preserving the same adapter and independent fixtures.

Distinguish normal end-of-window exhaustion, internal parser loop limits, unsupported timezone, worker timeout, and unexpected faults. The parser can throw during iteration, and iterator helpers may hide errors; translate these inside the adapter. Do not classify every caught exception as “Invalid cron.” [cron-parser date bounds](https://github.com/harrisiirak/cron-parser/blob/master/README.md), [cron-parser iteration implementation](https://github.com/harrisiirak/cron-parser/blob/master/src/CronExpression.ts)

### 7.3 Forecast rendering

Return the next five unique strictly increasing timestamps. Render `YYYY-MM-DD HH:mm:ss`, the selected zone, and a UTC offset where needed to distinguish repeated local times. Compute relative labels from the captured reference, with tested thresholds for less than a minute, minutes, hours, and days.

Syntax errors disable generated exports/share. A calendar combination proven never to run is a calendar validation error and also blocks committing it to valid history. An empty current week remains valid and exportable. A timeout or exhausted forecast horizon does not invalidate syntactically valid cron: crontab/YAML exports remain available, while AI context says the next run is unavailable instead of borrowing an old date.

### 7.4 Heatmap algorithm and accessible rendering

1. Compute Monday and the following Monday as local calendar midnights in the effective zone. Print each row's date, not just a weekday letter.
2. Iterate the execution adapter from just before the start boundary. Include a run exactly at the start; exclude one exactly at the end. Guard against non-increasing output.
3. Convert each occurrence to its zoned calendar date/hour and accumulate a count into the correct Monday–Sunday row and 00–23 column.
4. Mark `active = count > 0`. The required color behavior is binary; counts improve tooltips and accessible detail but need not create a frequency-color scale.
5. Handle skipped local hours as absent time, and aggregate repeated local hours into their shared visual cell. Distinguish these in the cell detail; do not infer an occurrence just because its wall-clock hour is allowed by the expression.
6. Show an explicit “No runs during [date range]” state when appropriate, while keeping the blank week visible and the next-run forecast independent.

Use lightweight divs for the visual cells as requested. Provide a compact accessible table/list equivalent with date, hour, run count, and DST context. Keep decorative cells out of the accessibility tree when the equivalent is present. If cell inspection is interactive, provide arrow-key navigation and one tab stop rather than 168 tab stops; touch/focus reveals the same detail as hover.

## 8. Exports and copy behavior

Implement a pure export builder taking a validated schedule, effective timezone, description, and preview result. Construct plain strings first; the highlighted React view must have identical text content. Quote cron strings in YAML and insert only validated schedule/timezone values. Never use `dangerouslySetInnerHTML` for input, errors, or highlighted code.

| Tab | Output contract | Visible context |
| --- | --- | --- |
| Linux crontab | One cron line followed by `/path/to/script.sh`; use the export-safe expression | Command is a placeholder; install in the intended user's crontab. Scheduling timezone is set by the cron environment/implementation. Do not imply a comment changes it. |
| GitHub Actions | `on.schedule` fragment with `cron` and explicit `timezone` matching the preview | This is a workflow fragment; jobs must be supplied. Show target-specific restrictions. |
| Kubernetes | `batch/v1` CronJob example with metadata, schedule, `spec.timeZone`, and complete `jobTemplate` structure | Image/command are editable placeholders; label the example accordingly. |
| AI Prompt | Expression, correct description, IANA timezone, absolute next run with offset or explicit unavailable status, and idempotency/timezone/shutdown requirements | Keep `[language/framework]` as an intentional fill-in placeholder. Do not claim the task has been implemented. |

For Kubernetes, use a syntactically complete sample pod template with a clearly identified example image, command, and `restartPolicy: OnFailure`; include `concurrencyPolicy: Forbid` as an explained example policy. Do not present the BRD's schedule-only object as an apply-ready resource. Kubernetes supports `.spec.timeZone`; a timezone prefix inside `.spec.schedule` is not its configuration mechanism. [Kubernetes CronJob documentation](https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/)

Current GitHub Actions documentation supports an IANA `timezone` on a scheduled trigger and specifies a minimum five-minute interval. Include the active zone instead of stating that Actions is UTC-only. Add a warning for schedules with execution gaps below five minutes, including wraparound between adjacent hours; preserve the expression and leave copying available. Display a small target note that scheduled execution and DST handling can differ from a preview. [GitHub Actions schedule event](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)

Determine sub-five-minute incompatibility from expanded minute/hour values across consecutive allowed dates, including midnight and DOM/month transitions; do not only check for the literal string `*/1`. If a bounded analysis cannot decide, present the minimum-interval rule without claiming the schedule is compatible. This diagnostic must never change the user's schedule automatically.

Copy behavior:

- Pill-bar copy: export-safe cron; raw-input copy: exact authored draft, including invalid text, clearly named “Copy raw input.” Pill-bar copy, generated-snippet, and Share buttons require a valid active schedule; raw copy remains available during invalid edits.
- Invoke `navigator.clipboard.writeText` from the user action; show `Copied!` only after its promise succeeds. Secure-context and permission failures must be caught. Offer selectable text for manual copying, preserve focus, and never report success on failure. [Clipboard writeText](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)
- Copy the latest displayed snippet, not a closure from a previous expression or tab. For AI context, block copying during a pending calculation or explicitly render “Next run: calculating”; prefer blocking until that revision completes.
- Share constructs the current-origin URL with the valid authored hash and copies it. Do not copy the stale address bar when the draft is invalid. Do not open a native share flow as a surprise.

## 9. Hash state, history, and AI discovery

### 9.1 Hash codec

Public schema: `#<minute>_<hour>_<dom>_<month>_<dow>`.

- Encode each validated authored token with `encodeURIComponent`, join with `_`, and prepend `#`. Preserve token spelling, including leading zeroes; normalize only field separators to the underscore representation.
- Accept the BRD's readable raw punctuation and equivalent percent-encoded forms. Split into exactly five segments, decode each once inside a try/catch, then run the ordinary dialect validator. Do not recursively decode encoded input.
- Examples `#0_2_*_*_1-5` and `#*%2F15_09-17_*_*_1-5` restore the intended five tokens. Malformed percent encodings, extra segments, forbidden characters, and oversized payloads produce recoverable link errors.
- Initial precedence: valid hash → default expression. Recent history is a list, not an implicit startup override. On invalid hash, show the rejected input/error and a Use default action; do not silently replace it with a successful-looking schedule. Missing hash loads the default normally.
- Replace the current URL entry on valid editing commits with the History API; do not create a browser Back entry for every keystroke. Skip writes when unchanged. Preserve origin/path; do not introduce routes.
- Listen for external hash changes and browser navigation. Prevent restoration/write loops, and avoid writing the default hash before initial restoration has finished. Programmatic history writes need not emit `hashchange`; route them through the same controller.
- Invalid edits retain the previous valid hash. The input error and disabled generated Share action make that state explicit.

The UI near Share should say that the link shares the expression and that the recipient previews it using their timezone setting. A timezone-bearing link format is a future versioned extension, not an undocumented suffix added in one module.

### 9.2 History and preferences

Use versioned, namespaced keys such as `cronbuild:history:v1` and `cronbuild:preferences:v1`. Store only bounded plain JSON. Read/write in try/catch; reject wrong shapes, oversized payloads, unknown enum values, and expressions that no longer validate. Never call `localStorage.clear()`.

History rules:

- Maximum ten valid expressions, newest first. Deduplicate by whitespace-normalized authored expression; do not collapse different day-field syntax into one entry based only on expanded values.
- Save valid raw edits after 600 ms of inactivity; flush a pending valid value on blur/Enter and explicit copy/share. Save preset/recent selections immediately. Invalid intermediate input cancels its pending save.
- Moving an existing expression to the front must not create a duplicate. Store the last-used timestamp for ordering, not a parsed object or precomputed forecast.
- Clicking a chip uses the normal replace-expression command. Keep empty history unobtrusive. Provide Clear recent history with an undo affordance; this is a small privacy control, not a cloud account flow.
- Avoid storage writes during render. Under Strict Mode, re-running an effect must not duplicate history. A cross-tab storage event may update history/preferences, but must not overwrite an in-progress raw draft.
- If persistence is unavailable, keep session history in memory and show a concise one-time message. Building, sharing, and copying remain usable.

### 9.3 `/llms.txt` and public documentation

Create `public/llms.txt` as a concise Markdown document with project H1, short blockquote, dialect/privacy facts, and the five-token hash recipe. Include at least the BRD restore example and one step/range example. State the timezone-sharing limitation and the fact that preview links do not execute jobs. Follow the published file structure and link to a static `public/cronbuild-guide.md` for extended grammar, field bounds, interval/OR semantics, examples, and limitations. The convention improves discoverability; it does not guarantee any particular assistant will fetch it. [llms.txt proposal](https://llmstxt.org/)

Use canonical `https://cronbuild.com/` URLs in public documentation and metadata; the Share action uses the current deployment origin so previews remain testable. Verify that `/llms.txt` and `/cronbuild-guide.md` are actual static files in `dist`, not the SPA HTML returned by a fallback.

## 10. Reliability, security, and performance

### 10.1 Required hardening

- Add a root error boundary with a useful recovery action. Catch parser, description, storage, hash decoding, clipboard, and worker errors at their own boundaries so ordinary bad input does not trigger the whole-app fallback.
- Treat raw input, fragment state, and stored JSON as untrusted data. Render text safely; do not evaluate expressions or interpolate input into HTML, CSS, executable code, or arbitrary links.
- No third-party runtime requests, tracking pixels, analytics scripts, error-reporting SDKs, or external font/icon loaders. Hosting access logs are separate from application tracking; avoid claiming the hosting provider receives no requests.
- Supply same-origin assets and worker files. Audit the built output for accidental Node polyfills, secrets, sourcemap references if not intended, and development/example assets.
- Add a production CSP allowing same-origin scripts, styles, fonts, assets, and workers, while denying objects, framing, foreign connections, and form submission. A starting policy can use `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; worker-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'`. Test the actual build before finalizing it; development HMR has different needs.
- Keep theme initialization external or use an exact build-maintained script hash; do not relax the policy globally for one inline script. Avoid style attributes if the chosen policy forbids them.
- Include `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, and a suitable permissions policy that does not disable clipboard writing. Document and test the actual deployed headers.

Cloudflare Pages reads static response rules from `_headers`; copy it from `public` into the built artifact. Test header effects on the deployed preview because Vite preview alone does not verify Pages behavior. [Cloudflare Pages headers](https://developers.cloudflare.com/pages/configuration/headers/)

### 10.2 Release budgets

These are proposed gates to measure during implementation:

| Area | Gate |
| --- | --- |
| Initial transfer | Target ≤250 KiB gzip for initial main JavaScript and ≤400 KiB including the eagerly loaded worker/dependencies; report actual chunk sizes |
| Styling/assets | Target ≤50 KiB gzip CSS; system fonts; no large decorative hero image |
| Editing | No visible caret jumps; no stale preview accepted; representative main-thread tasks ≤50 ms |
| Preview | Normal cases p95 ≤250 ms on a recorded reference device; dense/sparse inputs remain cancellable under the watchdog |
| Browser health | No uncaught errors, missing assets, or production console warnings |
| Accessibility | No serious/critical automated violations; manual keyboard, focus, contrast, and screen-reader review passes |
| Page performance | Median of three production mobile Lighthouse runs: performance ≥90 and accessibility ≥95; also inspect LCP ≤2.5 s and CLS ≤0.1 under the recorded profile |
| Privacy | No application-originated third-party network requests or telemetry |

Measure with the actual production bundle. If a budget fails, inspect import paths, duplicate packages, unnecessary locale data, and worker strategy before changing it. A documented threshold adjustment must identify its cause and user impact; do not mark a failed check as passed. Lab scores are not field performance measurements.

## 11. Sequenced implementation tasks

Execute tasks in this order. Each task should leave a working increment with its focused checks passing. Do not defer all integration or testing until the final task.

### T00 — Inspect scaffold and prove dependencies

**Dependencies:** None. **Covers:** R11.

1. Read repository instructions, the BRD, and this plan. Inspect current Git status and preserve unrelated work. Do not re-scaffold over the supplied project or restore deleted files without task-specific cause.
2. Inspect the generated package/configuration files. Record resolved versions, runtime, package manager, and current lint configuration; reconcile existing Oxlint configuration with the scaffold rather than adding conflicting rule systems.
3. Fetch current library documentation. Install only the packages in section 3 that the implementation uses; declare timezone arithmetic directly if used. Commit a lockfile as part of the eventual code change.
4. Prove `cron-parser`, descriptions, timezone arithmetic, and a minimal module worker build and execute in a real browser without Node polyfills.
5. Establish scripts for development, type checking, linting, formatting, unit tests, browser tests, build, and preview. Keep a clean-install path.

**Exit:** Scaffold builds; a browser smoke check calculates one fixed cron occurrence; no backend or external runtime dependencies appear. Record dependency/semantic assumptions before visual work.

### T01 — Implement cron grammar and execution adapter

**Dependencies:** T00. **Covers:** R03, foundations for R06–R08.

1. Build field metadata, structured issues, bounded grammar parsing, value expansion, and serialization.
2. Implement valid/impossible calendar distinction and the parser adapter, including DOW bound handling and combined day fields.
3. Add human-description handling and export-safe expression generation.
4. Write independent fixed-date fixtures before UI code. Include all mandatory cases in section 12.1, not just examples that the chosen parser already handles easily.

**Exit:** Dialect and adapter tests pass, exact authored tokens survive parse/serialize, and the difficult OR/step cases have explicit expected outcomes. No parser calls are scattered through components.

### T02 — Build the workspace state machine

**Dependencies:** T01. **Covers:** R02, R03.

1. Implement reducer commands, revision identity, incomplete editor drafts, and builder projection.
2. Connect raw edits and a minimal field control through one commit path.
3. Implement old-preview invalidation and the controller interfaces for hash, history, and worker integration.
4. Test raw cursor stability, rapid valid/invalid edits, unambiguous field repair, and effect idempotence.

**Exit:** Raw and GUI edits produce one coherent model; malformed drafts never cause a stale generated result to appear current.

### T03 — Establish visual shell and accessible primitives

**Dependencies:** T02. **Covers:** R01, R02, R12.

1. Implement semantic layout and shared theme tokens in both themes.
2. Build buttons, tabs, tooltip/error presentation, toast region, and theme bootstrapping.
3. Add the pill bar, raw input, and human summary connected to real state.
4. Check layout at 390 px and 1,440 px immediately; verify keyboard focus and reduced motion.

**Exit:** The actual domain model is visible in a polished responsive shell; theme reload and base keyboard behavior work.

### T04 — Complete all visual field builders

**Dependencies:** T03. **Covers:** R02–R04, R12.

1. Implement Every/Interval/Specific controls with field metadata and shared picker behavior.
2. Add minute, hour, DOM, month, and DOW panels; all required shortcuts and labels.
3. Implement Custom projection, empty-selection drafts, untouched-token preservation, and safe DOW interval serialization.
4. Add the pill text transition/change pulse without remounting focused controls.

**Exit:** Every field/mode combination and raw-to-GUI-to-raw journey in section 5 is tested. No mode silently changes a schedule simply by opening it.

### T05 — Add the searchable preset workflow

**Dependencies:** T04. **Covers:** R05, R12.

1. Add the exact ten presets and category grouping.
2. Implement button/shortcut open, search, result keyboard navigation, no-results feedback, and focus restoration.
3. Apply a preset through the same state command used for restoring a complete expression.

**Exit:** Every preset loads and synchronizes all current outputs; shortcut operation works from raw input and does not create duplicate listeners.

### T06 — Implement worker previews and timezone controls

**Dependencies:** T02, T04. **Covers:** R06, R07.

1. Implement timezone resolution, calendar boundaries, clock injection, and formatting helpers.
2. Implement next-five and bounded-week computation, worker protocol, stale-result rejection, cancellation, watchdog, and retry.
3. Render the heatmap, accessible equivalent, next runs, zone toggle, static relative labels, and explicit refresh.
4. Test UTC, Riyadh, a half-hour/quarter-hour zone, both DST transitions, no-runs week, impossible input, and sparse leap-day schedules.
5. Profile every-minute and rapid-edit scenarios; optimize if needed without changing results.

**Exit:** Forecast and heatmap use the same engine/revision/zone. Boundary and race-condition fixtures pass; measured performance meets budgets or is recorded as an unresolved release issue.

### T07 — Add developer/AI exports and resilient clipboard

**Dependencies:** T06. **Covers:** R08, R12.

1. Implement all four pure export templates and highlighted text views.
2. Add explicit target timezone fields/notes, sub-five-minute Actions diagnostics, and equivalent-expression disclosure when applicable.
3. Implement clipboard success/failure, two-second toast behavior, and manual-copy fallback.
4. Verify YAML structure with a test-only YAML parser configured so `on` remains the intended key; verify Kubernetes required structure and AI revision consistency.

**Exit:** Every export updates from the active schedule; timezone changes update applicable snippets; copied text equals displayed text. Placeholders are intentional and visible.

### T08 — Finish hash sharing and local persistence

**Dependencies:** T05, T07. **Covers:** R09.

1. Implement bounded hash encoding/decoding, startup precedence, invalid-link recovery, and navigation listeners.
2. Integrate valid hash replacement into the normal commit path without history spam or initialization races.
3. Implement ten-entry history, commit timing, deduplication, safe storage, preferences, and Clear/Undo.
4. Wire Share to the validated authored expression and document its timezone scope.

**Exit:** A fresh browser context restores BRD links without storage or server help; malformed hashes and blocked storage cannot crash the workspace.

### T09 — Prepare static production artifacts

**Dependencies:** T08. **Covers:** R10, R11.

1. Create `/llms.txt`, the static guide, favicon, title/description/canonical/Open Graph metadata, robots file, and one-URL sitemap. Keep any image assets local.
2. Add an informative `noscript` message explaining that interactive computation needs JavaScript. Metadata and public documentation remain readable without it.
3. Add production headers and caching rules: immutable hashed assets, revalidated HTML/documentation. Avoid overriding static documentation paths with a catch-all response.
4. Document the Pages build command, output directory, Node selection, branch/origin setup, and preview verification.

**Exit:** A clean build includes every public artifact; link examples round-trip; no runtime server or secret is needed.

### T10 — Run integrated UX and compatibility verification

**Dependencies:** T03–T09. **Covers:** R01–R12.

1. Run the browser journeys in section 12 against the production build, with the real worker and deterministic clock/zone fixtures.
2. Review dark/light screenshots at 320, 390, 768, 1,024, and 1,440 px; inspect 200% zoom and mobile landscape. Fix overflow, tiny targets, truncation, and focus visibility.
3. Perform keyboard-only and screen-reader smoke checks, reduced-motion tests, and automated accessibility checks.
4. Run performance, network, security, and dependency checks; record actual results and remaining issues.

**Exit:** All acceptance gates pass locally. Any proposed BRD amendment remains clearly identified; the test report does not claim literal one-render worker completion.

### T11 — Verify deployment and hand off

**Dependencies:** T10. **Covers:** R11 and release completion.

1. Build from a clean install in CI using the pinned runtime and lockfile. Run type, lint, unit/component, production-build, and browser checks. Keep failure artifacts available without adding application telemetry.
2. Configure Cloudflare Pages for the repository root, `npm run build` (or the existing package-manager equivalent), and `dist` output. Select the pinned supported Node runtime. No Functions or application environment secrets are required. [Cloudflare Pages Vite deployment](https://developers.cloudflare.com/pages/framework-guides/deploy-a-vite3-project/)
3. Use a preview deployment to verify HTTPS, headers/CSP, worker asset loading, deep links, clipboard, public text content types, and a browser refresh on `/`.
4. For the production release, verify the intended custom domain/canonical origin and repeat the short smoke checks. Document rollback to the previous known-good Pages deployment and cache considerations.
5. Complete README, implementation decisions, release checklist, and validation results. List actual versions, commands, browser coverage, known scheduler differences, and any remaining deployment-only actions.

**Exit:** A verified static artifact and handoff exist. Claim deployment completion only after an actual deployed URL has passed the checks; otherwise identify deployment access/configuration as the remaining step. This plan does not itself authorize publishing.

## 12. Verification specification

### 12.1 Mandatory domain fixtures

Use explicit UTC instants for most fixtures and an injected clock. Expected dates must be independently reasoned from the schedule; a test that compares one call to the same parser call is not a correctness test.

| Case | Expected assertion |
| --- | --- |
| `*/15 9-17 * * 1-5`, reference `2026-09-07T08:59:00Z`, UTC | Next runs 09:00, 09:15, 09:30, 09:45, 10:00 that Monday |
| Same schedule, UTC week starting `2026-09-07` | 45 active cells; four runs per active cell; 180 total runs |
| `* * * * *`, ordinary UTC week | 168 active cells; 60 runs per cell; 10,080 runs total |
| `0 9 * * 1-5`, reference `2026-09-07T05:59:00Z`, Asia/Riyadh | First run `2026-09-07T06:00:00Z`, displayed 09:00 local |
| `0 2 * * 1-5` shared as BRD example | Restores exactly minute/hour/DOM/month/DOW tokens; no server dependency |
| `20/15 * * * *` | Minute set 20,35,50; next hour restarts at 20 |
| DOW `1/2` | Product model Mon/Wed/Fri; adapter/export-safe field `1-6/2`; no Sunday |
| `0 0 1 * 1`, September 2026 | Monday OR the first of the month; includes Tuesday September 1 |
| `0 0 * * 1` versus `0 0 1-31 * 1` | Literal wildcard versus explicit full DOM range retains documented OR semantics |
| `0 0 31 2 1` | Mondays in February still run; impossible DOM branch must not suppress DOW |
| `0 0 31 2 *` | Calendar error, never an infinite loop or fabricated forecast |
| `0 0 31 * *` | Short months skipped; valid months retained |
| `0 0 29 2 *` | Five future leap-day runs; include a century-boundary case such as after 2096 |
| `0 0 1 1 *`, a September week | Empty heatmap with a valid future January forecast |
| `0 0 * * *`, reference exactly at midnight | Next result is following midnight, not the reference instant |
| `5,1,5` and overlapping ranges | Accepted set union; stable authored text; no duplicated occurrences |
| `*/100` in Minute | Valid one-value expansion, with no invented 100-minute elapsed interval |
| `80 * * * *`; `* * * 13 *` | Correct Minute/Month errors and affected pills |
| `*/0`; `1,,2`; `10-2`; `1/2/3`; missing/extra fields | Specific structured errors; no crash |
| Macros, names, seconds/years, `? L W # H`, Sunday `7` | Rejected as outside the product dialect |
| Leading zeroes, tabs, middle-of-string edits | Decimal semantics; authored tokens/caret preserved |
| Oversize raw/hash/storage values; malformed percent encoding | Bounded rejection with recovery; no silent truncation |

For America/New_York, test spring-forward and fall-back weeks with hourly and 02:30/01:30 schedules. Assert the pinned parser's actual instants, offsets, aggregation, and skipped/repeated-hour presentation. Add Asia/Kathmandu or another non-whole-hour zone to expose hour-offset assumptions. Also test a week crossing a month/year boundary. Record DST expectations as explicit fixtures once verified from the pinned version; do not invent a universal skip/duplicate policy.

### 12.2 Component and browser journeys

1. **AC1 / R02:** Edit each GUI field, then type a mixed expression in the raw editor. Assert pills, selected controls, summary, hash, and matching-revision preview. Check immediate pending state and eventual result separately under the section 2 amendment. Verify caret, composition, and undo/redo.
2. **AC2 / R03:** Enter the two BRD invalid examples, incomplete field count, and a provably impossible schedule. Check field errors, disabled generated outputs, working navigation, and recovery through a field edit/preset.
3. **AC3 / R05:** Load all ten presets, including keyboard search and Escape behavior. Assert exact tokens and refreshed computation.
4. **AC4 / R09:** Open a BRD hash in a new context without storage, then test percent encoding, navigation, invalid hash, and hash/local-history precedence.
5. **AC5 / R08:** For each tab, compare rendered text and clipboard payload; change expression and timezone. Cover target-specific timezone fields, DOW equivalent spelling, placeholders, copy rejection, manual fallback, and the two-second toast.
6. **AC6 / R06:** Use the fixed week fixtures, with an expression whose next five runs do not cover its whole week. Assert the entire grid and its accessible equivalent.
7. **AC7 / R10:** Request `/llms.txt` and the guide from the built app and deployed preview, check content type/body, extract their examples, and restore them.
8. **Persistence:** Insert eleven expressions, repeat one, refresh, clear/undo, block storage, inject corrupt JSON, and deliver a cross-tab update while typing.
9. **Race/recovery:** Send rapid edits and timezone changes while a slow worker request is running; deliver stale responses out of order. Force timeout, worker failure, and retry. No previous result may masquerade as current.
10. **Accessibility:** Navigate every feature using the keyboard; inspect roles/names/states, dialog focus restoration, visible validation, live feedback, and heatmap alternative. Run automatic checks in both themes with dialogs open and errors visible.
11. **Responsive behavior:** Exercise mobile pickers, preset search, exports, and landscape layout. Check bounded code/grid overflow and browser zoom.
12. **Static/privacy:** After the initial assets load, edit/preset/forecast/copy locally without network requests. Verify no third-party requests and no service-worker registration. This is an operation check, not a promise of offline reload support.

Use Chromium, Firefox, and WebKit for core smoke journeys; run the complete end-to-end suite in the primary CI browser and targeted compatibility tests in the others. Include a real Safari/iOS smoke check when available and record when it was not performed. Use semantic queries for UI tests, and add test IDs only where a visual grid cell needs a stable domain identifier. React Testing Library emphasizes user-visible component behavior. [React Testing Library introduction](https://testing-library.com/docs/react-testing-library/intro/)

### 12.3 Planned command contract

T00 must create these scripts or document equivalent existing names. These are future implementation checks, not commands that have passed during this planning task.

```text
npm ci
npm run typecheck
npm run lint
npm run format:check
npm run test:unit
npm run build
npm run test:e2e
```

`test:unit` runs once in CI rather than watch mode. `test:e2e` starts/uses the built preview, fixes time/timezone where a test requires it, and captures traces/screenshots on failure. Browser binaries and any test-only YAML/accessibility packages are development dependencies, not browser runtime dependencies. A passing build alone is not a substitute for type checking or runtime/browser tests.

## 13. Definition of done and LLM handoff

The implementing LLM should treat a feature as complete only when its real data flow, failure states, accessibility behavior, and listed acceptance tests are implemented. Placeholder diagrams, hard-coded forecast dates, fake clipboard toasts, decorative-only pickers, and parser results asserted against themselves do not satisfy this plan.

Before calling the app production-ready, verify:

- All R01–R12 rows are implemented and linked to passing checks. AC1's proposed asynchronous clarification and AC5's equivalent-expression edge case are disclosed in the decision log.
- Every advertised control works in both themes and the supported viewport/browser matrix. No unexplained TODO, dead button, broken link, template logo, or scaffold example remains.
- The domain fixtures establish cron, OR, step, leap-date, timezone, DST, and calendar-window behavior. All previews and exports refer to the current schedule revision.
- URL restore works with no local state. Invalid data, denied clipboard access, unavailable storage, and worker failure have tested recovery paths.
- A clean install builds static `dist`; `/llms.txt`, its guide, metadata, favicon, and security configuration ship with it.
- Performance, accessibility, security, and dependency results are recorded with commands, dates, and environment. Known limitations are stated accurately; failed or unrun checks are not labelled passed.
- README explains setup, development, checks, build/deployment, supported dialect, timezone/target behavior, persistence, privacy, and troubleshooting. Release documentation explains preview validation and rollback.
- Final handoff states what changed, what was actually verified, the artifact/deployment location, and any remaining release work.

Suggested execution instruction for a future LLM:

> Implement CronBuild using `docs/CronBuild_BRD_v1.0.md` and this plan. Start from the supplied Vite React/TypeScript scaffold and execute T00–T11 in dependency order. Preserve unrelated repository work. Fetch current documentation before library-specific implementation. Build the domain and state contracts before visual features, keep all computation client-side, and run each task's focused verification before continuing. Record the plan's explicit BRD clarifications and actual dependency versions. Finish all authorized implementation and validation work; report concrete deployment prerequisites separately if deployment access is unavailable. Do not claim production readiness from a successful build alone.
