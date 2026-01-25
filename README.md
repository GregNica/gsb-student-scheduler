# Calendar Event Generator for Students

An intelligent app that helps students automatically populate their Google Calendar with class dates, assignments, and deadlines extracted from course syllabi or schedules.

## What the App Does

Students can upload their course syllabus or schedule document (PDF, CSV, or Excel) and the app scans the document to identify important dates by searching for keywords like:
- Quiz, assignment, project, essay, case study, before class, homework, test, presentation, exam, exercise, case, take-home

The app automatically searches for all these keywords (no need to select which types). Students can also add custom keywords specific to their course.

The app then generates links that make it easy for students to add these events directly to their Google Calendar. It handles non-standardized document formats, so it works with syllabi in any layout.

## Features

- **SvelteKit 2** with Svelte 5 runes
- **Tailwind CSS v4** with custom SKKU-inspired theme
- **shadcn-svelte** components (Button, Card, Sidebar, Dialog, etc.)
- **Dark mode** support via mode-watcher
- **Command palette** (Cmd/Ctrl+K) for navigation
- **Responsive sidebar** layout
- **File upload** for syllabi and schedules (PDF, CSV, Excel)
- **Smart scanning** with confidence scoring (high/medium/low)
- **Assignment review** interface with edit/add/delete functionality
- **Custom keywords** support for course-specific assignment types

## Recent Changes (Assignment Keyword System Overhaul)

### Updated Keyword System
- **Before:** Students had to manually check boxes for assignment types they wanted to search for
- **Now:** All 13 default keywords are automatically searched (no selection needed)
- **Added:** Optional "Additional Keywords" field to add course-specific keywords

### Default Keywords (Always Searched)
```
quiz, assignment, project, essay, case study, before class, homework, test, presentation, exam, exercise, case, take-home
```

### Files Updated
- **courseStorage.ts**: Added `DEFAULT_KEYWORDS` array and `getAllKeywords()` function
- **setup/+page.svelte**: Removed assignment type checkboxes, added keyword info display and custom keywords textarea
- **keywordMatcher.ts**: Updated to use `DEFAULT_KEYWORDS` instead of checkbox-based selection
- **reviewStorage.ts**: New file for managing review session state (assignments in review workflow)
- **review/+page.svelte**: New page for validating and editing scan results before adding to calendar
- **assignmentAggregator.ts**: Fixed null handling for date requiresReview flag

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## How to Use

1. **Start the app** - Run `npm run dev` and open http://localhost:5173
2. **Set up your course** - Click "Course Setup" in the sidebar or use the command palette (Cmd/Ctrl+K)
   - Enter course name and number
   - Add custom keywords if needed (optional)
   - Set semester dates
   - Tell us when your class meets
3. **Upload your syllabus** - Click "Upload Syllabus" and select your document (PDF, CSV, or Excel)
4. **Review assignments** - The app automatically scans and displays found assignments
   - Edit names, types, or dates if needed
   - Add missing assignments manually
   - Delete assignments that aren't relevant
5. **Continue to calendar** - Proceed to calendar page to generate Google Calendar links
5. **Add to Google Calendar** - Generate links to quickly add events to your calendar (next step in development)

## Project Structure

```
src/
├── app.css                 # Theme and global styles
├── lib/
│   ├── components/
│   │   ├── sidebar/        # Sidebar navigation components
│   │   └── ui/             # shadcn-svelte components
│   └── utils/
│       └── courseStorage.ts # Course metadata storage
└── routes/
    ├── +layout.svelte      # App layout with sidebar
    ├── +page.svelte        # Home/dashboard
    ├── setup/
    │   └── +page.svelte    # Course setup form
    └── upload/
        └── +page.svelte    # Syllabus upload page
```

## Current Limitations

- ✋ **Course setup not persisted** - Data is stored in localStorage but not synced across devices
- ✋ **Date extraction not yet implemented** - Files can be uploaded but dates haven't been extracted yet
- ✋ **Google Calendar integration pending** - Calendar links haven't been generated yet
- ✋ **No keyword processing** - Document scanning for keywords is in the next step
- ✋ **Limited file size** - Currently limited to 10MB uploads
- ✋ **No email support** - Only directly uploaded files are supported
- ✋ **No file format preview** - Can't see extracted text before processing

## Next Steps

1. **/ Implement file text extraction**
   - Extract text from PDF files (using pdfjs-dist)
   - Parse CSV and Excel files (using xlsx library)
   - Handle different encoding formats

2. **@ Build the date scanner**
   - Use regex patterns to find dates in various formats (MM/DD/YY, Month Day, etc.)
   - Match dates against semester date range from course setup
   - Return list of found dates with context

3. **/ Search for keywords and match to dates**
   - Scan extracted text for selected assignment types: quiz, assignment, project, essay, case study, before class, homework
   - Link keywords to nearby dates
   - Handle future assignments (assignments mentioned without dates)

4. **@ Validate matches**
   - Check that dates fall on or near class meeting days
   - Filter out false matches outside semester
   - Present found events to user for review

5. **/ Generate Google Calendar links**
   - Create shareable Google Calendar event links
   - Allow users to preview events before adding to calendar
   - Support bulk adding multiple events
