# Business Requirements Document (BRD)
**Product:** CronBuild.com  
**Document Version:** 1.0 (Streamlined MVP)  
**Target Stack:** React 18+ (Vite), Tailwind CSS, Lucide Icons  
**Core Client Libraries:** `cronstrue` (human interpretation), `cron-parser` (next execution dates)  
**Execution Model:** 100% Client-Side (Zero-Backend, Serverless, Privacy-First)

---

## 1. Executive Summary & Strategic Value Proposition

CronBuild is a fast, lightweight, client-side visual cron expression generator and real-time interpreter. While conventional web-based cron generators are often cluttered, visually dated, or reliant on complex server-side scripts, CronBuild delivers an ultra-responsive, modern developer experience.

### 1.1 Strategic MVP Scope Pruning
To ensure rapid, deterministic, and bug-free implementation (especially when generating code via an LLM), key architectural optimizations have been made:
* **Fuzzy Preset Command Palette over Heuristic NLP:** Brittle client-side natural language regex parsers routinely fail on syntactic edge cases. CronBuild replaces ad-hoc NLP with a robust `Cmd+K` command palette containing pre-indexed, searchable real-world presets ("Every weekday at 9 AM", "Every 15 minutes during trading hours"). This satisfies user intent with 100% syntactic precision.
* **Pruning Low-Utility Gimmicks:** Removed reverse calendar pickers (algorithmically divergent for complex recurrences), `.ics` exports (cron jobs represent indefinite recurring processes rather than finite calendar appointments), and service worker PWA overhead for v1.
* **High-Leverage Developer Exporters:** Added instant copy-ready deployment snippets for **crontab**, **GitHub Actions**, and **Kubernetes CronJob** to maximize developer productivity.

---

## 2. Interactive GUI & UX Architecture

The application layout is structured as a unified, single-screen responsive workspace centered around an interactive **Tokenized Cron Pill Bar**.

### 2.1 Visual Workspace Wireframe

```text
+-----------------------------------------------------------------------------------+
|  [Logo] CronBuild.com                       [ 🔍 Search Presets (Cmd+K) ]  [Theme] |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|   TOKENIZED CRON BAR (Click any pill to open its builder tab):                     |
|   +-----------+ +-----------+ +-----------+ +-----------+ +-----------+           |
|   |  MINUTE   | |   HOUR    | |   D-O-M   | |   MONTH   | |   D-O-W   |   [Copy]  |
|   |    */15   | |   09-17   | |     *     | |     *     | |    1-5    |           |
|   +-----------+ +-----------+ +-----------+ +-----------+ +-----------+           |
|                                                                                   |
|   RAW CRON INPUT: [ */15 09-17 * * 1-5                                   ] [📋]   |
|   NATURAL SUMMARY: "Every 15 minutes, between 09:00 AM and 05:59 PM,              |
|                    Monday through Friday"                                         |
+-----------------------------------------------------------------------------------+
|  BUILDER TABS: [Minute] [Hour] [Day of Month] [Month] [Day of Week*]              |
|  -------------------------------------------------------------------------------  |
|  (Active Tab: Day of Week)                                                        |
|  ( ) Every day (*)                                                                |
|  (•) Specific days of the week:                                                   |
|      [ ] Sun  [x] Mon  [x] Tue  [x] Wed  [x] Thu  [x] Fri  [ ] Sat                |
|      Quick actions: [Select Weekdays] [Select Weekends] [Clear]                   |
|  ( ) Interval: Every [ 2 ] days starting on [ Tuesday ]                           |
+-----------------------------------------------------------------------------------+
|  NEXT 5 SCHEDULED RUNS (Local / UTC)        |  CI/CD & DEPLOYMENT SNIPPETS         |
|  Timezone: (•) Local [Asia/Riyadh] ( ) UTC |  Tabs: [Crontab] [GitHub Actions][K8s]|
|                                            |  -----------------------------------  |
|  1. 2026-09-02 09:00:00 (in 1h 01m)        |  schedule:                            |
|  2. 2026-09-02 09:15:00                    |    - cron: '*/15 09-17 * * 1-5'       |
|  3. 2026-09-02 09:30:00                    |                                       |
|  4. 2026-09-02 09:45:00                    |  [Copy Snippet]  [Share URL 🔗]       |
|  5. 2026-09-02 10:00:00                    |                                       |
+-----------------------------------------------------------------------------------+
|  RECENT & PINNED EXPRESSIONS:                                                     |
|  [⭐ */15 09-17 * * 1-5]  [0 0 * * * - Midnight]  [0 2 * * 0 - Weekly Backup]     |
+-----------------------------------------------------------------------------------+
```

### 2.2 Key UX Innovations
1. **Interactive Tokenized Pills:** The 5 POSIX fields (Minute, Hour, Day of Month, Month, Day of Week) are rendered as individual clickable badge tokens. Clicking any token immediately activates its dedicated configuration panel.
2. **Synchronous Bi-Directional Mirror:**
   - Modifying checkboxes, radios, or range sliders in the GUI instantly recalculates the raw string, updates the URL hash, and refreshes the human summary.
   - Typing or pasting directly into the raw text box instantly deconstructs the string, validates syntax, and adjusts the active GUI controls.
3. **Inline Syntax Guidance:** If an invalid token or out-of-range value is entered (e.g., `65` in the minute field), the affected pill turns amber/red with an actionable error message (`Minute must be between 0 and 59`).

---

## 3. Functional Requirements

### 3.1 POSIX Expression Engine & Tokenizer
* Supports standard 5-part POSIX cron syntax:
  ```
  ┌───────────── minute (0 - 59)
  │ ┌───────────── hour (0 - 23)
  │ │ ┌───────────── day of the month (1 - 31)
  │ │ │ ┌───────────── month (1 - 12 or JAN - DEC)
  │ │ │ │ ┌───────────── day of the week (0 - 6 or SUN - SAT)
  │ │ │ │ │
  * * * * *
  ```
* Standard operator support:
  * Asterisk (`*`) — Any value
  * Comma (`,`) — Value list separator (`1,3,5`)
  * Hyphen (`-`) — Range of values (`9-17`)
  * Slash (`/`) — Step values (`*/15`, `1-5/2`)

### 3.2 Visual Field Builders
Each field is managed through an intuitive, accessible tab panel:
* **Minute (0–59):**
  * Mode A: Every minute (`*`)
  * Mode B: Every `N` minutes starting from minute `X` (`X/N`)
  * Mode C: Specific selection via a compact 10x6 multi-select grid
* **Hour (0–23):**
  * Mode A: Every hour (`*`)
  * Mode B: Every `N` hours starting from `X` (`X/N`)
  * Mode C: Specific selection (24-hour visual picker with AM/PM indicators)
* **Day of Month (1–31):**
  * Mode A: Every day (`*`)
  * Mode B: Specific dates (1–31 calendar number matrix)
  * Mode C: Every `N` days starting on day `X`
* **Month (1–12):**
  * Mode A: Every month (`*`)
  * Mode B: Specific months (12 interactive pill toggles: Jan–Dec)
* **Day of Week (0–6):**
  * Mode A: Every day (`*`)
  * Mode B: Weekday shortcuts ([Weekdays: Mon-Fri], [Weekends: Sat-Sun])
  * Mode C: Individual day checkboxes (Sunday through Saturday)

### 3.3 Preset Command Palette (`Cmd+K` / `Ctrl+K`)
* Instant modal overlay featuring fuzzy-filtered real-world templates:
  * **System Operations:** "Run every minute", "Hourly on the hour", "Daily at midnight", "Every Sunday at 03:00 AM"
  * **DevOps & Batch:** "Every 5 minutes", "Weekdays at 09:00 AM", "Twice a day (12 PM, 12 AM)", "First day of every month at midnight"
* Selecting a preset closes the modal, populates the raw input, updates the GUI, and pushes the new state to the URL hash.

### 3.4 Execution Forecast & Timezone Engine
* Utilizes `cron-parser` to calculate the next 5 execution timestamps on the client side.
* **Timezone Toggle:**
  * Local Time (detected via `Intl.DateTimeFormat().resolvedOptions().timeZone`)
  * Coordinated Universal Time (UTC)
* **Relative Countdown Badge:** Next upcoming run includes a live humanized countdown badge (e.g., `in 42 minutes`).

### 3.5 Developer Export Snippets
Pre-configured, syntax-highlighted tabs for rapid copy-pasting into project infrastructure:
* **Linux crontab:**  
  `*/15 09-17 * * 1-5 /path/to/script.sh`
* **GitHub Actions Workflow:**
  ```yaml
  on:
    schedule:
      - cron: '*/15 09-17 * * 1-5'
  ```
* **Kubernetes CronJob Spec:**
  ```yaml
  apiVersion: batch/v1
  kind: CronJob
  metadata:
    name: scheduled-job
  spec:
    schedule: "*/15 09-17 * * 1-5"
  ```
* **AWS EventBridge / CloudWatch:**  
  Generates standard cron target notes or POSIX-adjusted cron schedules.

### 3.6 Stateless Sharing & Local History
* **Hash-Based Sharing:** Expression state is mirrored to the URL hash (e.g., `https://cronbuild.com/#0_2_*_*_1-5`). Loading this link instantly initializes the application with the exact shared state without server or database dependencies.
* **One-Click Actions:**
  * Copy raw cron string
  * Copy human explanation
  * Copy share URL
  * Copy active CI/CD snippet
* **Recent & Pinned Storage:**
  * Automatically stores the last 10 valid expressions in `localStorage`.
  * Users can click a "Star" icon to permanently pin favorite expressions.

---

## 4. State Architecture (LLM Implementation Guide)

When implementing CronBuild with an LLM, use the following clean TypeScript data contracts:

```typescript
// Root Application State
export interface CronAppState {
  rawExpression: string;       // e.g. "*/15 9-17 * * 1-5"
  isValid: boolean;
  errorMessage: string | null;
  humanReadable: string;       // Generated via cronstrue
  activeTab: 'minute' | 'hour' | 'dom' | 'month' | 'dow';
  timezone: 'local' | 'utc';
  nextRuns: string[];          // Next 5 ISO timestamps
  history: HistoryItem[];
  pinned: string[];
}

export interface HistoryItem {
  expression: string;
  description: string;
  timestamp: number;
}

// GUI Field State Slices
export type FieldSelectionType = 'every' | 'interval' | 'specific';

export interface FieldState {
  type: FieldSelectionType;
  intervalValue: number;
  intervalStart: number;
  specificValues: number[];
}
```

### Component Hierarchy
```text
App
├── Header (Logo, Search Presets Trigger, Dark/Light Mode)
├── PresetSearchModal (Cmd+K dialog, keyboard navigable)
├── TokenizedCronBar (Interactive segment pills, raw text field, copy buttons)
├── NaturalLanguageBanner (Formatted human text via cronstrue)
├── BuilderTabsContainer
│   ├── MinuteBuilder
│   ├── HourBuilder
│   ├── DayOfMonthBuilder
│   ├── MonthBuilder
│   └── DayOfWeekBuilder
├── DashboardBottomGrid
│   ├── NextExecutionsCard (Local/UTC toggle, timestamp list, relative countdown)
│   └── CodeSnippetsCard (Crontab, GitHub Actions, Kubernetes tabs)
└── RecentAndPinnedBar (Quick-load chips with star/remove actions)
```

---

## 5. Non-Functional Requirements

* **Zero Latency & Client-Side Execution:** Keystroke evaluation and translation must complete in $<10	ext{ ms}$. No server calls or third-party tracking APIs.
* **Lightweight Footprint:** Production bundle size $\le 250	ext{ KB}$ gzipped.
* **Accessibility (WCAG 2.1 AA):**
  * Complete keyboard navigation (`Tab` index through pills, `Arrow` keys across tab panels, `Space`/`Enter` to toggle days/hours).
  * Explicit ARIA roles (`role="tablist"`, `role="tab"`, `aria-selected`, `aria-live="polite"` for human descriptions).
* **Responsive Breakpoints:**
  * Mobile viewport ($< 768	ext{px}$): Horizontal scrolling token bar, stacked two-column bottom cards.
  * Desktop viewport ($\ge 768	ext{px}$): Full token layout with side-by-side execution forecast and code snippet cards.

---

## 6. Scope Boundaries & MVP Differentiation

| Feature Area | In Scope (MVP v1.0) | Out of Scope (Post-MVP v2.0) |
| :--- | :--- | :--- |
| **Cron Syntax** | Standard 5-field POSIX (`* * * * *`) | 6-field (seconds) & 7-field (years) |
| **Input Methods** | Interactive GUI + Raw Input + `Cmd+K` Presets | Freeform heuristic client NLP engine |
| **Output Formats** | Crontab, GitHub Actions, K8s, AWS | `.ics` Calendar files, Systemd timers |
| **State Storage** | URL Hash + Browser `localStorage` | Cloud database, user accounts, teams |
| **Execution** | Client-side forecast (Next 5 runs via `cron-parser`) | Live webhook monitoring / ping alerts |
| **Visualizations**| Interactive Token Pills + Relative Countdown | Complex 30-day run frequency histograms |

---

## 7. MVP Acceptance Criteria

1. **Deterministic Bi-Directional Sync:** Modifying any control in the GUI updates the raw string immediately without cursor jumps; editing the raw string synchronizes all GUI controls accurately.
2. **Error Resilience:** Entering invalid expressions (e.g., `80 * * * *` or `* * * 13 *`) cleanly transitions the UI into a non-crashing error state with specific field-level hints.
3. **Preset Execution:** Selecting any preset item from the `Cmd+K` palette populates the raw string, updates GUI tabs, and generates execution previews in $< 50	ext{ ms}$.
4. **Zero-Backend State Restoral:** Appending `#15_10_*_*_1-5` to the application URL and refreshing in an incognito window faithfully restores all 5 fields and highlights the active tokens.
5. **LLM Feasibility:** Complete codebase can be generated and assembled in standard modern React/Tailwind without complex custom parsers by referencing `cronstrue` and `cron-parser`.
