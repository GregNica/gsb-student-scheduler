# Project: Syllabus to Google Calendar Porter (Svelte 5)

## 🛠 Critical Technical Context
- **Framework:** SvelteKit using **Svelte 5 Runes**.
  - *Crucial:* All reactive state MUST use `$state()` and `$derived()`. Previous bugs were caused by using Svelte 4 "let" syntax which broke the UI reactivity.
- **Icons:** Use `@lucide/svelte`.
  - *Note:* Do NOT import from 'lucide-svelte'. Icons must be imported individually via `@lucide/svelte/icons/[icon-name]`.
- **Styling:** Tailwind CSS + Shadcn UI components (located in `$lib/components/ui`).

## 🔍 Debugging & Log Symbols
The previous agent implemented a unique logging system to trace the scanner logic. If the scanner fails, check the browser console for these symbols:
- `굽굾굿궀`: File reading progress/file type detection.
- `궁궂궃궄`: Date finding logic and semester range validation.
- `껳껱껲`: Keyword matching results.
- `蚘蚓蚔`: Context analysis (matching keywords to dates).
- `膆`: Final assignment aggregation and storage.

## ⚠️ Known Challenges & Past Bugs
- **Mismatched If-Blocks:** The `upload/+page.svelte` has historically had issues with nested `{#if}` tags causing Vite compilation errors. Be careful when editing the progress UI section.
- **Date Recognition Failures:** The `dateFinder.ts` often struggles with non-standard Excel/CSV layouts. If dates are found as `0`, the "Context Analyzer" will fail even if keywords are present.
- **Missing Storage Files:** There was a significant "ghost file" issue where the code expected `reviewStorage.ts` but it hadn't been created yet. Ensure all imports in `+page.svelte` files point to existing files in `src/lib/utils/`.

## 📍 Where We Left Off
1.  **Course Setup:** Working. Saves name, dates, meeting times, and custom keywords to `localStorage`.
2.  **File Upload:** Working. Includes a 4-step progress visualization (Reading -> Scanning -> Processing -> Preparing).
3.  **The Scanner:** The core logic in `syllabusScannerMain.ts` is functional but requires "Smart" improvements for date extrapolation (e.g., converting "Week 3" into a specific date based on the semester start).
4.  **The Review Interface:** A `/review` page exists to show Green/Yellow/Red confidence flags, but the transition from "Scan Complete" to this page needs to be seamless.

## 🚀 Immediate Mission
- Improve the `DateFinder` utility to better handle "Week X" or "Session X" logic by referencing the meeting days stored in `courseStorage.ts`.
- Ensure the "Add to Calendar" link generation (the final step) correctly formats the Google Calendar URL with the extracted description.
