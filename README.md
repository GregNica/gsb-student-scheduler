# SKKU Schedule to Calendar

A web app for SKKU FMBA and MMS students and professors to convert their official course timetable files into `.ics` calendar files for Google Calendar, Outlook, or Apple Calendar.

---

## What It Does

SKKU distributes course schedules as Excel exports (from the academic portal) and PDF timetables (for intensive programs like FMBA and MMS). This app reads either format, lets you review and correct the parsed courses, and downloads a `.ics` file you can import directly into any calendar app.

**Key capability:** The PDF parser handles the FMBA/MMS grid-style timetable (the kind with colored cells, course codes like `MMS5002`, and period subtitles like `SpIW : First Intensive Mar 2 - 6`). This is non-trivial to parse because it's a visual grid, not a structured data export.

---

## Who It's For

- **Students** — Upload your personal Excel schedule export from the SKKU portal, select which semester periods you're enrolled in, and download a calendar file.
- **Professors** — Upload the full program PDF timetable, select your name from the detected instructor list, and download a calendar with `[FMBA]`/`[MMS]` program prefixes on each event.

---

## How to Use the App

The app is a three-step flow. A progress bar at the top tracks which step you're on.

### Step 1 — Schedule Setup (`/setup`)
1. Choose your role: **Student** or **Professor**
2. Select which semester period(s) you want — e.g., Sp1, SpIW1, SpIW2, Sp2, GFT, Su, SuIW
3. Upload your file: Excel (`.xls`, `.xlsx`) or PDF
4. Click **Scan Schedule**

### Step 2 — Review Schedule (`/schedule-review`)
- Courses are shown sorted by: semester period → program (FMBA/MMS) → day → time
- Professors see a name dropdown to filter courses by instructor
- You can edit any field (title, code, meeting times, instructor, credits, campus), delete a course, or add one manually
- When satisfied, click **Proceed to Download**

### Step 3 — Download Calendar (`/calendar-download`)
- Shows a summary of all courses and their meeting slots
- Click **Download .ics** to save the file
- Import the file into Google Calendar (*File → Import*), Outlook (*File → Open & Export → Import*), or Apple Calendar (*File → Import*)

---

## Development Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev   # → http://localhost:5173

# Build (standard SvelteKit static output)
npm run build

# Build single-file HTML (for portable deployment)
npm run build:single
```

The app is deployed as a single self-contained `.html` file — all JavaScript, CSS, and assets are inlined. There is no backend server.

---

## Backend Architecture

All business logic lives in `src/lib/utils/`. Here's what each file does:

### Parsers — turn raw files into structured course data

| File | What it does |
|------|-------------|
| `scheduleScannerMain.ts` | **Orchestrator.** Detects whether the file is PDF or Excel, picks the right parser, and returns a uniform `ScheduleScanResult`. This is the only file the UI calls directly. |
| `scheduleExcelReader.ts` | Reads the **standard SKKU Excel export** format — 3 rows per course, with course code in column B, title in column C, class time in a specific column, etc. |
| `scheduleExcelGridReader.ts` | Reads a **grid-layout Excel** file where days are column headers and times are row headers. The `isGridFormat()` function auto-detects which format to use. |
| `pdfGridParser.ts` | Reads the **FMBA/MMS PDF timetable**. Uses three strategies in sequence: (S1) code-anchored text extraction, (S2) slash-format parsing for intensive-week blocks, (S3) visual block detection + text heuristic fallback. The most complex file in the project. |
| `pdfVisualBlockExtractor.ts` | Low-level helper used by `pdfGridParser.ts`. Extracts the colored and bordered rectangles from each PDF page so Strategy S3 can find visually highlighted course cells. |
| `scheduleParser.ts` | **Shared type definitions** (`ParsedCourse`, `MeetingSlot`, `CourseDateRange`, etc.) plus utility functions for parsing meeting-slot strings and building summary statistics. Everything that needs to pass a course object imports its types from here. |

### Storage — manage the review session

| File | What it does |
|------|-------------|
| `scheduleReviewStorage.ts` | Stores the active review session in browser `sessionStorage` (not `localStorage` — data is cleared when you close the tab). Handles filtering courses by selected period labels, professor filtering, and CRUD operations for the review UI. |
| `navigation.ts` | A thin wrapper around `window.location.hash` assignment. Necessary because the app uses hash-based routing and SvelteKit's built-in `goto` doesn't reliably trigger re-renders when the hash changes. |

### Export — turn reviewed courses into a calendar file

| File | What it does |
|------|-------------|
| `icsGenerator.ts` | Generates an RFC 5545-compliant `.ics` file. Each course becomes a `VEVENT` with weekly recurrence (`RRULE:FREQ=WEEKLY`) between the selected semester start and end dates. Professor mode adds `[FMBA]`/`[MMS]` prefixes; student mode shows the instructor name. |

---

## File Format Assumptions

The parsers were written against specific file versions. If those formats change, parsing may break silently (producing wrong data rather than errors).

### Standard SKKU Excel Export

The 3-row-block parser (`scheduleExcelReader.ts`) assumes:
- **Row 1 of data block:** Course code (col B), course title (col C), credits (col E), hours (col F), instructor (col G), major type (col H)
- **Row 2 of data block:** Campus (col B), class time/room string (col C), class type (col E), course type (col H), module (col I)
- **Row 3 of data block:** Confirmed status (col B), remarks (col C)
- The class time/room string follows the pattern: `Day HH:MM-HH:MM【Room】` — e.g., `Tue17:10-18:50【9B113】`
- Day codes may be English abbreviations (`Mon`, `Tue`, …) or Korean characters (`월`, `화`, `수`, `목`, `금`)

If SKKU changes column positions or the day code format, update `scheduleExcelReader.ts` (column mapping) and `scheduleParser.ts` (the `SLOT_REGEX` pattern).

### FMBA/MMS PDF Timetable

The PDF parser (`pdfGridParser.ts`) assumes:
- Section headers match the pattern `FMBA (Spring)` or `MMS (Spring)` — these anchor each grid section
- Course codes follow the pattern `[A-Z]{2,4}\d{4}[A-Z]?` — e.g., `GSB5206`, `MMS5011`
- Intensive-week courses use slash format: `Course Title / CODE / Instructor Name (Mar 2 - 6)`
- The subtitle line above each section header uses the format: `SpIW : First Intensive Mar 2 - 6 / Break / Second Intensive Mar 16 - 20`
- Month names in the subtitle are spelled out in English (Jan, Feb, Mar, …)
- Visual course cells have non-white fill or stroke colors (used by Strategy S3a)

If SKKU releases a redesigned PDF layout (different fonts, different grid structure, different header text), the `buildSections()` function in `pdfGridParser.ts` will need updating.

---

## Semester Periods — When to Update

The semester period checkboxes on the Setup page are **hardcoded** in `src/routes/setup/+page.svelte` in the `SEMESTER_PERIODS` array (around line 40). Each entry has:
- A unique `id` (e.g., `sp1-2026`)
- A `label` that matches the parser's period labels (e.g., `Sp1`, `SpIW1`)
- Exact start and end dates
- An optional `startDate2`/`endDate2` for periods with a mid-semester break (e.g., Sp1 has a Lunar New Year break)
- A `tentative: true` flag if dates aren't confirmed yet

**Current periods in the app (as of early 2026):**

| Period | Label | Dates |
|--------|-------|-------|
| Spring 1 | Sp1 | Jan 12 – Feb 27, 2026 (break Feb 14–22) |
| Spring Intensive Week 1 | SpIW1 | Mar 2–6, 2026 |
| Spring Intensive Week 2 | SpIW2 | Mar 16–20, 2026 |
| Spring 2 | Sp2 | Mar 23 – May 1, 2026 |
| Global Field Trip | Global Field Trip | May 4–8, 2026 |
| Summer | Su | May 11 – Jun 19, 2026 (FMBA 1Y only) |
| Summer Intensive Week | SuIW | Jun 29 – Jul 3, 2026 |
| Fall 1 | F1 | Aug 24 – Oct 9, 2026 (tentative) |
| Fall Intensive Week 1 | FIW1 | Oct 12–16, 2026 |
| Fall Intensive Week 2 | FIW2 | Oct 26–30, 2026 |
| Fall 2 | F2 | Nov 2 – Dec 11, 2026 (tentative) |

**When to update (typically once per academic year):**
1. When SKKU publishes the new academic calendar, add a new group of `SEMESTER_PERIODS` entries for the next year
2. Keep prior years in the array — users may still need them for old files
3. Mark dates as `tentative: true` until SKKU officially confirms them
4. The `label` values (`Sp1`, `SpIW1`, `Sp2`, `Su`, `SuIW`, `GFT`, `F1`, `F2`) must match exactly what the PDF timetable parser looks for in subtitle lines. Do not rename them.

---

## Cautionary Notes for Editing the Code

### The PDF parser is the most fragile component

`pdfGridParser.ts` is the most complex file (~900 lines). The three parsing strategies build on each other, and changes to how sections are detected (`buildSections()`), how subtitles are parsed (`findSectionDateRanges()`), or how date ranges are matched can break multiple downstream behaviors. If you need to edit it:
- Read the strategy comments carefully before making changes
- Test against both the FMBA-only PDF and the combined FMBA+MMS PDF
- Test all period combinations (Sp1 only, SpIW1+SpIW2 only, all periods together)
- The key invariant: the `label` in `CourseDateRange` (e.g., `"SpIW1"`) must match a label in the user's selected periods for the course to appear in the review

### Period labels must stay consistent

The string labels `"Sp1"`, `"SpIW1"`, `"SpIW2"`, `"Sp2"`, `"Su"`, `"SuIW"`, `"GFT"`, `"F1"`, `"F2"` appear in three places that must stay in sync:
1. The `label` field of `SEMESTER_PERIODS` in `setup/+page.svelte`
2. The subtitle parsing regex in `parseSubtitleDateRanges()` in `pdfGridParser.ts`
3. The `label` fields in `CourseDateRange` objects stored in `scheduleReviewStorage`

If a label is renamed in any one place but not the others, that period's courses will silently disappear from the review page.

### Hash routing — don't use SvelteKit's `goto` or `page` store

The app uses hash-based routing (`#/setup`, `#/schedule-review`, etc.) for compatibility with static file hosting. SvelteKit's `goto` and `page` store do not reliably update on hash changes. Always use the `goto` function from `src/lib/utils/navigation.ts` for navigation, and `window.location.hash` or a `hashchange` event listener for reading the current route.

### Session storage is wiped on page close

Course data is stored in `sessionStorage` (not `localStorage`). If a user closes and reopens the tab, they start from scratch. This is intentional — the review session is meant to be ephemeral. Do not change this to `localStorage` without thinking through what "stale session" behavior you want when a user reopens the tab.

### The `isGridFormat()` detection is heuristic

`scheduleExcelGridReader.ts` auto-detects whether an Excel file uses the grid layout (days as columns) vs. the 3-row-block layout. The detection looks at the first row for day-name patterns. If an unusual Excel file triggers the wrong parser, the course list will be empty or garbled. There's no fallback retry — if `isGridFormat()` returns `true`, only the grid parser runs.

### Svelte 5 runes are required throughout

All reactive state uses Svelte 5 syntax: `$state()`, `$derived()`, `$effect()`. Do not use Svelte 4 patterns (`let x` with `$:` reactivity, `export let` props without `$props()`, etc.) — they silently fail to update in Svelte 5.

---

## What's Not Part of the Schedule Workflow

The following files and routes exist in the codebase but are **not part of the active schedule → calendar flow**. They are an earlier, incomplete project (a syllabus assignment scanner). They work independently and should not be modified as part of schedule workflow changes:

- `src/lib/utils/`: `syllabusScannerMain.ts`, `keywordMatcher.ts`, `dateFinder.ts`, `contextAnalyzer.ts`, `assignmentAggregator.ts`, `assignmentTypeClassifier.ts`, `fileReader.ts`, `courseStorage.ts`, `reviewStorage.ts`
- `src/routes/`: `upload/`, `review/`, `setup-legacy/`, `colors/`, `documentation/`, `components/`, `settings/`
