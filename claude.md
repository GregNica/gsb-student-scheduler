# Project: SKKU Schedule to Calendar Porter

## Overview
A static SvelteKit web app that parses SKKU course timetables (Excel or PDF) into `.ics`
calendar files. No backend — entirely client-side, deployed as a single self-contained HTML file.

**Primary user flow:** Setup → Review → Download
1. `/setup` — Upload a timetable file, select semester periods (Sp1/SpIW1/SpIW2/Sp2/etc.), choose role (student or professor)
2. `/schedule-review` — Review and edit parsed courses before export
3. `/calendar-download` — Download `.ics` file for Google Calendar, Outlook, or Apple Calendar

---

## Architecture

### Key Technical Decisions
- **SvelteKit 2 + Svelte 5 Runes** — All reactive state uses `$state()`, `$derived()`, `$effect()`. Do NOT use Svelte 4 `let` syntax or `$:` labels — reactivity will silently break.
- **Hash routing** (`router.type: 'hash'` in svelte.config.js) — Navigation uses `window.location.hash`, not SvelteKit's `goto`. The custom `src/lib/utils/navigation.ts` wrapper handles this correctly. Do NOT use `$app/state`'s `page` store for URL tracking — it doesn't update on hash changes.
- **Static adapter + inline bundling** — Output is a single `.html` file. `bundleStrategy: 'inline'` means all JS/CSS is inlined. No CDN resources.
- **Tailwind CSS v4** — Configured via `@tailwindcss/vite` plugin, not a config file.
- **Icons** — Use `@lucide/svelte/icons/[icon-name]` (individual imports). Do NOT use `lucide-svelte`.
- **Shadcn-svelte components** — Located in `$lib/components/ui/`. Do not edit those files.

### Storage
- **sessionStorage** (`scheduleReviewStorage.ts`) — Stores the review session (parsed courses + user edits). Cleared when the browser tab closes.
- **No localStorage** for the schedule workflow. `courseStorage.ts` and `reviewStorage.ts` belong to the legacy syllabus workflow and are not used by the current app.

---

## Active Source Files

### Parsers (input → structured data)
| File | Purpose |
|------|---------|
| `scheduleScannerMain.ts` | Orchestrator — detects file type and routes to the correct parser |
| `scheduleExcelReader.ts` | Parses SKKU standard Excel format (3 rows per course) |
| `scheduleExcelGridReader.ts` | Parses grid-layout Excel (days as columns, times as rows) |
| `pdfGridParser.ts` | Parses PDF timetable grids (FMBA/MMS format) using 3 strategies |
| `pdfVisualBlockExtractor.ts` | Extracts colored/bordered rectangles from PDF pages (used by pdfGridParser S3a) |
| `scheduleParser.ts` | Shared type definitions + utility functions for meeting-slot parsing and summarization |

### Storage / State
| File | Purpose |
|------|---------|
| `scheduleReviewStorage.ts` | Manages the active review session in sessionStorage |
| `navigation.ts` | `goto()` wrapper for hash routing |

### Export
| File | Purpose |
|------|---------|
| `icsGenerator.ts` | Generates RFC 5545-compliant `.ics` files with RRULE recurrence |

### UI Components
| Path | Purpose |
|------|---------|
| `src/routes/+layout.svelte` | App shell — wraps all pages in the progress bar + max-width container |
| `src/lib/components/schedule-progress-bar.svelte` | 3-step progress indicator (Setup → Review → Download). Tracks current step via `hashchange` event. |
| `src/routes/setup/+page.svelte` | File upload UI + period selector + role switcher |
| `src/routes/schedule-review/+page.svelte` | Course review/edit/delete UI |
| `src/routes/calendar-download/+page.svelte` | Download UI |

---

## PDF Parser Architecture (pdfGridParser.ts)

The PDF parser uses three strategies in sequence per table section:

1. **S1 — Code anchors**: Find course codes (e.g., `MMS5002`) as unambiguous anchors, then search above/below for title and instructor.
2. **S2 — Slash format**: Find lines like `Title / CODE / Instructor (Mar 2 - 6)` used in intensive-week blocks.
3. **S3a — Visual blocks**: Find colored/bordered rectangle cells and match text inside them. Returns `null` if no visual structure found.
4. **S3b — Text heuristic fallback**: When S3a returns null, group candidate text items by (day column × time slot) cell and classify them as titles vs. instructor names.

**Section metadata:** Each `TableSection` carries `dateRanges: CourseDateRange[]` which are parsed from the subtitle line above the section header (e.g., `SpIW : First Intensive Mar 2 - 6 / Break / Second Intensive Mar 16 - 20`). Only subtitles matching the period-label pattern (`Sp...:`, `SpIW:`, `GFT:`, etc.) are recognized — loose month-name matching was deliberately removed to prevent false positives.

**Date range filtering** (in `scheduleReviewStorage.ts`): When the user selects specific periods (e.g., SpIW1, SpIW2), only courses whose `dateRanges` include a matching label are stored. Non-matching `dateRanges` are stripped from kept courses so the ICS generator only sees the correct date window.

---

## Role Behavior
- **Student**: All file types accepted (Excel + PDF). ICS events show instructor name. No program prefix in event titles.
- **Professor**: All file types accepted. ICS events show `[FMBA]` or `[MMS]` prefix + program field. Instructor name omitted. Review page shows name dropdown to filter by professor.

---

## Legacy / Unused Code
The following exist but are **not part of the active schedule workflow**. Do not add dependencies to them from the schedule workflow:
- `syllabusScannerMain.ts`, `keywordMatcher.ts`, `dateFinder.ts`, `contextAnalyzer.ts`, `assignmentAggregator.ts`, `assignmentTypeClassifier.ts`, `fileReader.ts`, `courseStorage.ts`, `reviewStorage.ts` — original syllabus assignment scanner (incomplete PDF support)
- `src/routes/upload/`, `src/routes/review/`, `src/routes/setup-legacy/` — legacy syllabus workflow pages
- `src/routes/colors/`, `src/routes/documentation/`, `src/routes/components/`, `src/routes/settings/` — demo/reference pages from initial scaffolding

---

## Semester Period Presets (must update each academic year)

`SEMESTER_PERIODS` in `src/routes/setup/+page.svelte` (~line 40) is a hardcoded array of all selectable periods with exact start/end dates. Add new yearly entries when SKKU publishes its calendar. The `label` values (`Sp1`, `SpIW1`, `Sp2`, `Su`, `SuIW`, `GFT`, `F1`, `FIW1`, `FIW2`, `F2`) must match exactly what `parseSubtitleDateRanges()` in `pdfGridParser.ts` emits — they are the keys that link the PDF parser's output to the user's selection.

## Common Pitfalls
- **`page` store doesn't update on hash navigation** — always use `window.location.hash` directly or the `hashchange` event.
- **pdfjs-dist must only run in browser** — any import of `pdfGridParser.ts` or `pdfVisualBlockExtractor.ts` must be inside `$effect` or `onMount`, never at module level in SSR context (though this app is fully static, SvelteKit still pre-renders).
- **Deduplication is title-substring-based in S3b** — if a slash-format course title is a substring of a codeless course title (e.g., "Finance Workshop" ⊆ "Advanced Finance Workshop"), the codeless course will be suppressed. Pass only `codeBasedCourses` (not slash-based) to `extractCodelessCourses`.
- **Column boundary tolerance** — S3b uses `xStart - 15` tolerance on the left bound so first-column courses positioned slightly left of the detected boundary aren't rejected. Time column text is caught by separate pattern filters, so this is safe.
