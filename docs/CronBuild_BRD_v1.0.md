# Business Requirements Document (BRD)
**Product:** CronBuild.com
**Version:** 1.0 (MVP)
**Stack:** React 19+ (Vite), Tailwind CSS, TypeScript, Lucide Icons
**Hosting:** Cloudflare Pages (100% Client-Side Static Single-Page App)
**Libraries:** `cronstrue` (human-readable output), `cron-parser` (execution forecast)
**Architecture:** 100% client-side — zero backend, zero external API keys, zero tracking, privacy-first

---

## 1. Overview

CronBuild is an ultra-fast, client-side visual cron expression builder and real-time interpreter. It runs entirely in the browser with zero backend dependencies, targeting developers and DevOps engineers who need to construct, validate, and export cron schedules without memorizing syntax. The tool features an interactive tokenized pill bar, a 24h × 7d visual heatmap timeline, instant CI/CD and AI developer export snippets, and native `llms.txt` deep-linking support — all wrapped in a polished, dark-mode-first interface.

---

## 2. GUI Layout

Single-screen responsive workspace. No routing, no page reloads — everything is visible and interactive at once.

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
│  VISUAL TIMELINE (24h × 7d)          │  DEVELOPER & AI EXPORTS       │
│  ┌──────────────────────────────┐    │  Tabs: [crontab] [GH Actions] │
│  │  Heatmap / dot grid showing │    │        [Kubernetes] [AI Prompt]│
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

1. **Dark mode default.** Light mode available via toggle. Developer tools should feel native to modern IDE/terminal workflows.
2. **Animated pill transitions.** When a pill value changes, the old value fades out and the new value slides in smoothly. CSS transitions only — no heavy animation libraries.
3. **Change diff flash.** When a field changes, its pill briefly pulses with an accent glow to clearly highlight what changed.
4. **Toast feedback.** Every copy action triggers a brief "Copied!" toast notification (auto-dismiss after 2s). No silent clipboard writes.
5. **Inline validation.** Invalid tokens turn the affected pill amber/red with an actionable tooltip error (e.g., "Minute must be 0–59"). The rest of the UI remains interactive.
6. **Bi-directional sync.** GUI $\leftrightarrow$ raw string are always in lockstep. Editing either side instantly synchronizes the other, the human summary, the 24h×7d timeline, the next runs forecast, and the URL hash.

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
- **Common:** Every minute, Every 5 minutes, Every 15 minutes, Hourly, Daily at midnight, Weekly on Sunday at 3 AM.
- **Business:** Weekdays at 9 AM, Twice daily (noon & midnight), First of every month, Quarterly (Jan/Apr/Jul/Oct 1st).

Selecting a preset populates the raw input, syncs the GUI, and updates the URL hash.

### 4.4 Visual Timeline (24h × 7d Heatmap)
A compact heatmap grid: 7 rows (Mon–Sun) × 24 columns (00–23). Cells where the cron fires are highlighted with the accent color; inactive cells are dimmed.
- **Implementation:** Simple lightweight `<div>` grid. Cell active state is computed client-side via `cron-parser`. Zero charting libraries.

### 4.5 Execution Forecast
Displays the next 5 execution timestamps computed by `cron-parser`.
- Formatted date/time in the selected timezone (Local or UTC).
- Static relative label (e.g., "in 42 min") — computed on expression change, not live-ticking.
- Timezone is auto-detected via `Intl.DateTimeFormat().resolvedOptions().timeZone` with a toggle to switch to UTC.

### 4.6 Developer & AI Export Snippets
Four tabbed code blocks with syntax highlighting and instant "Copy" buttons:

1. **Linux crontab:**
   ```
   */15 09-17 * * 1-5 /path/to/script.sh
   ```
2. **GitHub Actions:**
   ```yaml
   on:
     schedule:
       - cron: '*/15 09-17 * * 1-5'
   ```
3. **Kubernetes CronJob:**
   ```yaml
   apiVersion: batch/v1
   kind: CronJob
   metadata:
     name: scheduled-job
   spec:
     schedule: "*/15 09-17 * * 1-5"
   ```
4. **AI Prompt Context (for Cursor / Claude / ChatGPT / Copilot):**
   ```text
   Implement a background task in [language/framework] running on this schedule:
   - Cron Expression: `*/15 09-17 * * 1-5`
   - Description: Every 15 minutes, between 09:00 AM and 05:59 PM, Monday through Friday
   - Timezone: Asia/Riyadh (Next run: 2026-09-02 09:00:00)
   Requirements: Ensure idempotency, timezone safety, and proper graceful shutdown handling.
   ```

### 4.7 Sharing & History
- **URL Hash Sharing:** Full expression state is encoded in the URL hash (e.g., `#*/15_09-17_*_*_1-5`). Opening this link restores the exact state without server dependencies.
- **Recent Expressions:** The last 10 valid expressions are auto-saved to `localStorage` and displayed as clickable chips.

### 4.8 AI Ecosystem Integration (`llms.txt`)
- **Static `/llms.txt` Spec:** Serves a standard `/llms.txt` file on Cloudflare Pages documenting CronBuild's URL schema (`https://cronbuild.com/#<minute>_<hour>_<dom>_<month>_<dow>`).
- **AI Agent Deep-Linking:** Enables AI coding assistants (ChatGPT, Claude, Cursor, Copilot) to generate direct, verifiable preview links for users when authoring cron schedules in code.

---

## 5. Scope Boundaries

| Area | MVP (v1.0) | Post-MVP (v2.0+) |
|:---|:---|:---|
| **Cron Syntax** | 5-field POSIX (`* * * * *`) | 6-field (seconds), 7-field (years) |
| **Input Methods** | GUI + Raw Input + Preset Dropdown | Freeform natural language input |
| **AI Integration** | "Copy for AI" context snippets + `llms.txt` spec (Zero backend) | On-device browser AI (`window.ai` / Gemini Nano), WebGPU offline models |
| **Exports** | Crontab, GitHub Actions, Kubernetes, AI Prompt | AWS EventBridge, systemd timers, `.ics` |
| **Persistence** | URL hash + `localStorage` | Cloud sync, team presets |
| **Forecast** | Next 5 runs (client-side) | Webhook test monitor, live execution alerts |
| **Visualization** | 24h×7d heatmap timeline | 30-day run frequency histogram, calendar view |
| **Compare** | — | Side-by-side visual expression diff |
| **Accessibility** | Keyboard navigation + semantic HTML | Full WCAG 2.1 AA audit |
| **PWA** | — | Service worker, offline install |

---

## 6. Acceptance Criteria

1. **Bi-directional Sync:** Changing any GUI control updates the raw string, human summary, timeline, next runs, and URL hash within one render cycle. Editing the raw string syncs all GUI controls without cursor jumps.
2. **Validation:** Entering invalid expressions (e.g., `80 * * * *` or `* * * 13 *`) highlights the affected pill in red with an actionable field-specific error message.
3. **Preset Loading:** Selecting any preset populates all fields, updates the timeline, and refreshes next runs.
4. **Stateless Restore:** Navigating to `cronbuild.com/#0_2_*_*_1-5` in an incognito window faithfully restores all 5 fields and active tokens.
5. **Export & AI Prompt Accuracy:** All 4 export tabs (crontab, GitHub Actions, Kubernetes, AI Prompt) accurately reflect the active cron expression. Copy buttons trigger clipboard writes and display a "Copied!" toast.
6. **Timeline Accuracy:** The 24h×7d heatmap lights up only the specific day/hour slots matching the active cron expression.
7. **AI Agent Spec (`llms.txt`):** The repository includes a static `public/llms.txt` accurately documenting the URL deep-linking structure for AI coding agents.
