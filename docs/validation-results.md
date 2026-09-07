# Validation results

Validation dates: 2026-09-07–08. Platform: macOS 26.6.2, ARM64, Node 24.20.0, npm 11.19.0. These are local results for the production Vite artifact. No deployed URL or completed remote CI run is claimed.

## Command evidence

| Check                       | Actual result                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci`                    | Passed from the lockfile; 238 packages installed, 239 audited. Optional fsevents install script remained unapproved; all subsequent builds/tests worked.                                          |
| `npm run typecheck`         | Passed with strict TypeScript enabled for app, configuration, and browser tests.                                                                                                                  |
| `npm run lint`              | Passed without warnings after final fixes.                                                                                                                                                        |
| `npm run format:check`      | Passed. Source documents supplied by the user are excluded from formatting.                                                                                                                       |
| `npm run test:unit`         | 74 tests passed across seven files, including a Strict Mode composition/focus component test.                                                                                                     |
| `npm run build`             | Passed; static `dist/` contains HTML, JS, CSS, module worker, and all required public files.                                                                                                      |
| `npm run test:e2e`          | 29-test full suite passed; subsequent expanded 9-test cross-browser smoke suite passed (six added cases; 35 total cases now). Real bundled worker used except deliberate failure-injection tests. |
| `npm audit`                 | Zero reported vulnerabilities. This is an advisory-service result, not a guarantee of no vulnerabilities.                                                                                         |
| `npm run audit:performance` | Three production mobile Lighthouse runs; final measured summary is recorded below.                                                                                                                |

## Requirements and coverage

| Requirement             | Evidence and scope                                                                                                                                                                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R01 responsive theme    | Dark default and persisted light reload tested; screenshots generated for both themes at 320, 390, 768, 1024, and 1440 px and visually reviewed. No body overflow in the tested viewports. Long pill/bounds overlap fixed and rechecked.                                                                                                      |
| R02 synchronization     | Raw/GUI edits, all field modes, untouched range/leading-zero spellings, caret, composition under Strict Mode, incomplete field recovery, tab keys, revisions, and hash updates tested. Async preview is separately pending; AC1’s documented amendment applies.                                                                               |
| R03 dialect/errors      | Fixed grammar fixtures cover bounds, unsupported syntax, steps, duplicates, zeroes, tabs, lengths, calendar impossibility, and malformed hashes. Field errors block generated outputs.                                                                                                                                                        |
| R04 builders            | All five fields and offered modes exercised. Empty selection and incomplete interval remain invalid through unrelated field edits. Long minute selections serialize within limits without becoming a wildcard.                                                                                                                                |
| R05 presets             | All ten exact presets exercised through the UI and domain/hash pipeline. Keyboard search, no-results, Escape, and focus restoration tested.                                                                                                                                                                                                   |
| R06 weekly timeline     | Independent fixtures prove 180 business-week runs/45 cells, 10,080 every-minute runs/168 cells, empty weeks, year boundaries, and DST aggregation. Dated rows and a complete hourly table are present.                                                                                                                                        |
| R07 forecasts/timezones | Strictly future runs, 31st skipping short months, leap dates across 2100, DOM/DOW OR, UTC, Riyadh, Kathmandu, and both New York DST transitions tested. Captured clock and offset formatting are used.                                                                                                                                        |
| R08 exports/copy        | All four displayed strings match mocked successful clipboard payloads; rejection produces manual text. YAML 1.2 fixtures validate timezone fields and complete Kubernetes structure. Equivalent cron and target caveats are disclosed. Two-second success toast tested. Real hosted secure-context clipboard remains a deployment check.      |
| R09 sharing/history     | Fresh-context BRD link, encoded examples, invalid links, blocked/corrupt storage, ten-entry deduplication, clear/undo, and cross-tab draft preservation tested. Pending autosave suppression after Clear implemented.                                                                                                                         |
| R10 static AI docs      | Built `/llms.txt` and guide return real documentation rather than SPA HTML; example links restore through ordinary validation.                                                                                                                                                                                                                |
| R11 static/privacy      | Artifact inspected for server/polyfill/scaffold remnants. Only same-origin application assets load. Normal edits after initial load make no further network requests. No service worker. Shipped CSP tested by applying its exact policy to local responses. Actual Cloudflare response/header/cache behavior is unverified until deployment. |
| R12 accessibility       | No serious/critical axe violations in both themes, with presets open and errors visible. Tabs, pickers, dialog search/focus, reduced motion, and enlarged-text layout exercised. Native screen-reader review and a real iOS device check have not been completed. No WCAG certification is claimed.                                           |

## Reliability fixes verified during implementation

- Exact numeric bounds and literal-wildcard day flags prevent dependency dialect drift.
- Separate feasible DOM and DOW streams preserve OR behavior for February 31 combined with a weekday.
- Input length is rejected before tokenization; large input is never truncated into a different schedule.
- Long visual minute selections compress to ranges without altering selected values.
- Incomplete interval drafts live in the reducer and cannot become valid accidentally when another field changes.
- Old results are invalidated on edits; response metadata checks reject stale results. Failed/hung workers have Retry paths. Idle workers are reused.
- Preset Escape reliably closes and restores focus after search. Pill animation retains text contrast, respects reduced motion, and keeps bounds separate from long values.
- GitHub Actions frequency warnings detect provable gaps across midnight, including month/year boundaries and leap dates, without inventing adjacent matching dates.
- Theme-only storage events preserve the captured forecast clock. Clear suppresses pending autosave while an explicit later selection can save the same expression again.
- Storage/clipboard failures do not crash the workspace, and success is never reported for a rejected clipboard write.
- `_headers` uses explicit revalidation routes to avoid conflicting Cache-Control values from overlapping broad rules.

## Performance

The final production browser suite sampled 20 edits across every-minute, every-five-minute, weekday, and leap-day schedules. Preview p95: **111.3 ms**. Recorded main-thread long tasks: **none** during the sampled editing phase. This is measured on this ARM64 macOS host under three concurrent test workers; it is not a guarantee for all devices.

Lighthouse uses its standard mobile simulation: 412×823 emulation, slow 4G model (150 ms RTT, 1,638.4 Kbit/s throughput), and 4× CPU slowdown. Full JSON reports are generated under `test-results/lighthouse/`; a compact final summary is retained under `docs/verification/`.

## Unverified release work

1. Cloudflare Pages account/project selection, deployment authorization, and preview deployment are pending. A question requesting the target and preview authorization has been presented. No public or private hosting deployment was performed.
2. Actual HTTPS, Cloudflare-applied security/cache headers, hosted text content types, secure-context clipboard, custom-domain/canonical mapping, and rollback validation require that deployment.
3. The CI workflow exists and local equivalent commands pass; it has not been run by GitHub Actions in this session.
4. A native Safari UI attempt was interrupted by a change to the active app and is not counted as a passed test. Playwright WebKit smoke did pass. A real iOS/Safari device smoke and native screen-reader review remain unperformed.
5. Native undo/redo keyboard events now pass in the Playwright Chromium, Firefox, and WebKit engines, with forecast and hash synchronization asserted. Landscape preset search and export controls pass at 844×390 in both themes in those engines. These checks and the enlarged-text fixture do not replace manual browser zoom or assistive-technology review. Complete the manual release checks before an unrestricted production-readiness claim.

Local review URL: `http://127.0.0.1:5197/` while the development server is running. Deliverable artifact: `dist/`. Source, tests, decision log, public guide, README, and release/rollback checklist are in this worktree. The pre-existing deletion of `docs/tasks.md` was preserved.

## Final Lighthouse and artifact measurements

The three Lighthouse runs preceded the final calendar-warning and persistence logic fixes; the full production browser suite and artifact sizes above/below were refreshed after those fixes.

Median performance: **99**; accessibility: **100**; LCP: **1.80 seconds**; CLS: **0**. All three runs passed the stated gates.

- index-BWqG2Ds3.css: 6.0 KiB gzip.
- index-BAWFpiZU.js: 127.4 KiB gzip.
- schedule.worker-36Goso9Z.js: 51.8 KiB gzip.

Browser binaries: Chromium 153.0.8010.12 (revision 1243), Firefox 155.0 (1543), WebKit 26.6 (2359). After the final CSS adjustment, the five responsive journeys and enlarged-text journey passed again.
