# Business Requirements Document (BRD)
**Product:** CronBuild.com
**Version:** 1.0 (MVP)
**Stack:** React 18+ (Vite), Tailwind CSS, Lucide Icons
**Libraries:** `cronstrue` (human-readable output), `cron-parser` (execution forecast)
**Architecture:** 100% client-side — zero backend, zero tracking, privacy-first

---

## 1. Overview

CronBuild is a visual cron expression builder and interpreter that runs entirely in the browser. It targets developers who need to construct, validate, and export cron schedules without memorizing syntax. The tool differentiates itself through an interactive tokenized pill bar, a 24h × 7d visual timeline, and instant CI/CD export snippets — all in a polished, dark-mode-first interface.

---

## 2. GUI Layout

Single-screen workspace. No routing, no pages — everything is visible and interactive at once.

```text
┌──────────────────────────────────────────────────────────────────────┐
│  [Logo] CronBuild                    [Preset ▾ dropdown]   [☀/🌙]  │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  TOKENIZED CRON PILL BAR (click any pill to configure):              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ MINUTE  │ │  HOUR   │ │  D-O-M  │ │  MONTH  │ │  D-O-W  │  [📋] │
│  │  */15   │ │  09-17  │ │    *    │ │    *    │ │   1-5   │       │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│                                                                      │
│  RAW INPUT: [ */15 09-17 * * 1-5                             ] [📋] │
│  SUMMARY:   "Every 15 min, 09:00 AM – 05:59 PM, Mon–Fri"           │
├──────────────────────────────────────────────────────────────────────┤
│  BUILDER PANEL                                                       │
│  Tabs: [Minute] [Hour] [Day of Month] [Month] [Day of Week▪]        │
│  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │
│  (Active: Day of Week)                                               │
│  (○) Every day (*)                                                   │
│  (●) Specific days:                                                  │
│      [ ] Sun  [✓] Mon  [✓] Tue  [✓] Wed  [✓] Thu  [✓] Fri  [ ] Sat │
│      Quick: [Weekdays] [Weekends] [Clear]                            │
│  (○) Interval: Every [2] days starting [Tuesday]                     │
├──────────────────────────────────────────────────────────────────────┤
│  VISUAL TIMELINE (24h × 7d)          │  EXPORT SNIPPETS              │
│  ┌──────────────────────────────┐    │  Tabs: [crontab] [GH Actions] │
│  │  Heatmap / dot grid showing │    │        [Kubernetes]            │
│  │  when the cron expression   │    │  ┌──────────────────────────┐  │
│  │  fires across the week      │    │  │ schedule:                │  │
│  └──────────────────────────────┘    │  │   - cron: '*/15 …'      │  │
│                                      │  └──────────────────────────┘  │
│  NEXT 5 RUNS                         │  [Copy Snippet]  [Share URL]  │
│  TZ: (●) Local [Asia/Riyadh] (○) UTC│                               │
│  1. 2026-09-02 09:00 (in 1h)         │                               │
│  2. 2026-09-02 09:15                 │                               │
│  3. 2026-09-02 09:30                 │                               │
│  4. 2026-09-02 09:45                 │                               │
│  5. 2026-09-02 10:00                 │                               │
├──────────────────────────────────────────────────────────────────────┤
│  RECENT: [*/15 09-17 * * 1-5] [0 0 * * *] [0 2 * * 0]  ← auto-saved│
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. UX Principles

1. **Dark mode default.** Light mode available via toggle. Developer tools should feel native to terminal/IDE workflows.
2. **Animated pill transitions.** When a pill value changes, the old value fades out and the new value slides in. CSS transitions only — no animation libraries.
3. **Change diff flash.** When a field changes, its pill briefly pulses with an accent glow to draw attention to what changed.
4. **Toast feedback.** Every copy action triggers a brief "Copied!" toast notification (auto-dismiss after 2s). No silent clipboard writes.
5. **Inline validation.** Invalid tokens turn the affected pill amber/red with a tooltip error (e.g., "Minute must be 0–59"). The rest of the UI remains interactive.
6. **Bi-directional sync.** GUI → raw string and raw string → GUI are always in lockstep. Editing either side instantly updates the other, the human summary, the timeline, the next-5-runs list, and the URL hash.

---

## 4. Core Features

### 4.1 Cron Syntax Engine
Standard 5-field POSIX cron: `minute hour day-of-month month day-of-week`. Supported operators: `*` (any), `,` (list), `-` (range), `/` (step).

### 4.2 Visual Field Builders
Each of the 5 fields gets a dedicated tab panel with these modes:

| Field | Mode A (Wildcard) | Mode B (Interval) | Mode C (Specific) |
|:---|:---|:---|:---|
| **Minute** (0–59) | Every minute `*` | Every N min from X `X/N` | 10×6 multi-select grid |
| **Hour** (0–23) | Every hour `*` | Every N hours from X `X/N` | 24-cell picker with AM/PM labels |
| **Day of Month** (1–31) | Every day `*` | Every N days from X `X/N` | 31-cell calendar grid |
| **Month** (1–12) | Every month `*` | — | 12 toggle pills (Jan–Dec) |
| **Day of Week** (0–6) | Every day `*` | Every N days from X | 7 checkboxes + Weekday/Weekend shortcuts |

### 4.3 Preset Dropdown
A searchable dropdown (triggered by button click or `Cmd+K` / `Ctrl+K` keyboard shortcut) containing common real-world schedules:

- **Common:** Every minute, Every 5 minutes, Every 15 minutes, Hourly, Daily at midnight, Weekly on Sunday at 3 AM
- **Business:** Weekdays at 9 AM, Twice daily (noon & midnight), First of every month, Quarterly (Jan/Apr/Jul/Oct 1st)

Selecting a preset closes the dropdown, populates the raw input, syncs the GUI, and updates the URL hash.

### 4.4 Visual Timeline (24h × 7d)
A compact heatmap grid: 7 rows (Mon–Sun) × 24 columns (00–23). Cells where the cron fires are filled with the accent color; inactive cells are dim. This gives an instant visual fingerprint of the schedule's coverage.

Implementation: a simple `<div>` grid. Each cell is a small square. Color is toggled based on whether `cron-parser` produces a hit in that hour/day slot. No canvas, no charting library.

### 4.5 Execution Forecast
Display the next 5 execution timestamps computed by `cron-parser`. Each timestamp shows:
- Formatted date/time in the selected timezone (Local or UTC)
- Static relative label (e.g., "in 42 min") — computed once when the expression changes, not live-ticking

Timezone is auto-detected via `Intl.DateTimeFormat().resolvedOptions().timeZone` with a toggle to switch to UTC.

### 4.6 Developer Export Snippets
Three tabbed code blocks with syntax highlighting and a "Copy" button each:

**Linux crontab:**
```
*/15 09-17 * * 1-5 /path/to/script.sh
```

**GitHub Actions:**
```yaml
on:
  schedule:
    - cron: '*/15 09-17 * * 1-5'
```

**Kubernetes CronJob:**
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: scheduled-job
spec:
  schedule: "*/15 09-17 * * 1-5"
```

### 4.7 Sharing & History
- **URL hash sharing:** Expression state is encoded in the URL hash (e.g., `#*/15_09-17_*_*_1-5`). Loading this URL restores the full state. The "Share URL" button copies this link.
- **Recent expressions:** The last 10 valid expressions are auto-saved to `localStorage` and displayed as clickable chips at the bottom of the page. Clicking a chip restores that expression.

---

## 5. Scope Boundaries

| Area | MVP (v1.0) | Post-MVP (v2.0+) |
|:---|:---|:---|
| Cron syntax | 5-field POSIX | 6-field (seconds), 7-field (years) |
| Input | GUI + raw input + preset dropdown | Freeform natural language input |
| Exports | crontab, GitHub Actions, Kubernetes | AWS EventBridge, systemd timers, `.ics` |
| Persistence | URL hash + `localStorage` | Cloud sync, accounts, teams |
| Forecast | Next 5 runs (client-side) | Webhook monitoring, alerting |
| Visualization | 24h×7d timeline heatmap | 30-day histogram, calendar overlay |
| Compare | — | Side-by-side expression diff |
| Accessibility | Keyboard navigation + semantic HTML | Full WCAG 2.1 AA audit |
| PWA | — | Service worker, offline support |

---

## 6. Acceptance Criteria

1. **Bi-directional sync:** Changing any GUI control updates the raw string, human summary, timeline, next runs, and URL hash within one render cycle. Editing the raw string syncs all GUI controls. No cursor jumps in the text input.
2. **Validation:** Entering `80 * * * *` or `* * * 13 *` highlights the offending pill in red with a field-specific error message. The app does not crash or blank out.
3. **Preset loading:** Selecting any preset from the dropdown populates all fields, updates the timeline, and shows the correct next 5 runs.
4. **Stateless restore:** Navigating to `cronbuild.com/#0_2_*_*_1-5` in an incognito window correctly restores the expression `0 2 * * 1-5` with all pills, builder, timeline, and forecast reflecting that schedule.
5. **Export accuracy:** Each of the 3 export snippets contains the exact current cron expression in the correct format for its target platform. Copy buttons write to clipboard and show a toast.
6. **Timeline accuracy:** The 24h×7d heatmap correctly lights up only the cells where the current expression would fire.
