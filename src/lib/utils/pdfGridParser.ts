// @ PDF Grid Parser for timetable format
// # Purpose: Parse grid-based timetables from PDFs (like FMBA/MMS course schedules)
// # Strategy: Anchor on course codes (e.g., GSB5206, MMS5002) which are unambiguous,
// # then find the title above and instructor below each code.

import * as pdfjsLib from 'pdfjs-dist';
import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import type { ParsedCourse, MeetingSlot, ProgramType, CourseDateRange } from './scheduleParser';
import {
	extractPageRectangles,
	colorsMatch,
	isNearWhite,
	type PdfRect,
	type RGBColor,
} from './pdfVisualBlockExtractor';

// Point workerSrc at the worker module. Since this file is only loaded via
// dynamic import (never during SSR), import.meta.url is always defined here.
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
	'pdfjs-dist/build/pdf.worker.min.mjs',
	import.meta.url
).toString();

// / A text item with position data
interface PositionedText {
	text: string;
	x: number;
	y: number;
	width: number;
	height: number;
	page: number;
}

// / A detected table section (FMBA or MMS)
interface TableSection {
	program: ProgramType;
	room: string;
	headerY: number;
	endY: number;
	page: number;
	dayColumns: DayColumn[];
	timeSlots: TimeSlot[];
	dateRanges: CourseDateRange[]; // Date ranges extracted from subtitle (e.g., "Sp1 : Jan 12 - Feb 27")
}

// / A column representing a day of the week
interface DayColumn {
	day: string;
	xCenter: number;
	xStart: number;
	xEnd: number;
}

// / A time slot (pair of start/end times)
interface TimeSlot {
	startTime: string;
	endTime: string;
	yCenter: number; // midpoint Y of this slot for proximity matching
}

// / Result from parsing a PDF timetable
export interface PdfParseResult {
	courses: ParsedCourse[];
	extractedProfessors: string[];
	metadata: {
		fileName: string;
		pageCount: number;
		sectionsFound: number;
	};
}

// / Month name to number mapping for parsing subtitle dates
const MONTH_MAP: Record<string, number> = {
	jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
	jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// / Parse a subtitle date string like "Jan 12" or "Feb 27" into a Date
// Uses a reference year (inferred from context or current year)
function parseSubtitleDate(text: string, referenceYear: number): Date | null {
	const match = text.match(/(\w{3})\s+(\d{1,2})/i);
	if (!match) return null;
	const month = MONTH_MAP[match[1].toLowerCase()];
	if (month === undefined) return null;
	const day = parseInt(match[2], 10);
	return new Date(referenceYear, month, day);
}

// / Format a Date as ISO YYYY-MM-DD
function formatISO(date: Date): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// / Extract date ranges from a subtitle line, excluding break periods.
// Handles formats like:
//   "Sp1 : Jan 12 - Feb 27 (Lunar New Year Break: Feb 16 - 20)"
//   "SpIW : First Intensive Mar 2 - 6 / Break Mar 9 - 13 / Second Intensive Mar 16 - 20"
//   "Sp2 : Mar 23 - May 1"
function parseSubtitleDateRanges(text: string, referenceYear: number): CourseDateRange[] {
	const ranges: CourseDateRange[] = [];

	// Extract the label before the colon (e.g., "Sp1", "SpIW", "Sp2")
	const labelMatch = text.match(/\b(Sp\w*|GFT|Su\w*|F\d+)\s*:/i);
	const label = labelMatch ? labelMatch[1] : '';

	// Split by "/" for slash-separated formats (intensive weeks)
	const segments = text.includes('/') ? text.split('/') : [text];

	for (const segment of segments) {
		const trimmed = segment.trim();

		// Skip break segments (but not segments that just have break info in parentheses)
		const withoutParenBreak = trimmed.replace(/\([^)]*break[^)]*\)/gi, '');
		if (/break/i.test(withoutParenBreak)) continue;

		// Month name pattern for matching
		const MON = '(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)';
		// Find date range pattern: "Mon DD - Mon DD" or "Mon DD - DD" (same month)
		const fullRangeMatch = trimmed.match(new RegExp(`(${MON})\\s+(\\d{1,2})\\s*[-–]\\s*(${MON})\\s+(\\d{1,2})`, 'i'));
		const sameMonthMatch = trimmed.match(new RegExp(`(${MON})\\s+(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})`, 'i'));

		if (fullRangeMatch) {
			// Different months: "Jan 12 - Feb 27"
			const start = parseSubtitleDate(`${fullRangeMatch[1]} ${fullRangeMatch[2]}`, referenceYear);
			const end = parseSubtitleDate(`${fullRangeMatch[3]} ${fullRangeMatch[4]}`, referenceYear);
			if (start && end) {
				// Check if there's a break embedded in parentheses within this segment
				const breakMatch = trimmed.match(new RegExp(`\\([^)]*break[^)]*:\\s*(${MON})\\s+(\\d{1,2})\\s*[-–]\\s*(\\d{1,2})\\)`, 'i'));
				if (breakMatch) {
					// Split into before-break and after-break ranges
					const breakStart = parseSubtitleDate(`${breakMatch[1]} ${breakMatch[2]}`, referenceYear);
					const breakEnd = parseSubtitleDate(`${breakMatch[1]} ${breakMatch[3]}`, referenceYear);
					if (breakStart && breakEnd) {
						const beforeBreakEnd = new Date(breakStart);
						beforeBreakEnd.setDate(beforeBreakEnd.getDate() - 1);
						const afterBreakStart = new Date(breakEnd);
						afterBreakStart.setDate(afterBreakStart.getDate() + 1);

						if (beforeBreakEnd >= start) {
							ranges.push({ start: formatISO(start), end: formatISO(beforeBreakEnd), label: label || undefined });
						}
						if (afterBreakStart <= end) {
							ranges.push({ start: formatISO(afterBreakStart), end: formatISO(end), label: label || undefined });
						}
						continue;
					}
				}
				ranges.push({ start: formatISO(start), end: formatISO(end), label: label || undefined });
			}
		} else if (sameMonthMatch) {
			// Same month: "Mar 2 - 6"
			const monthStr = sameMonthMatch[1];
			const startDay = sameMonthMatch[2];
			const endDay = sameMonthMatch[3];
			const start = parseSubtitleDate(`${monthStr} ${startDay}`, referenceYear);
			const end = parseSubtitleDate(`${monthStr} ${endDay}`, referenceYear);
			if (start && end) {
				// Determine a sub-label for intensive week segments
				let segLabel = label;
				if (/first/i.test(trimmed)) segLabel = label ? `${label}1` : 'IW1';
				else if (/second/i.test(trimmed)) segLabel = label ? `${label}2` : 'IW2';
				ranges.push({ start: formatISO(start), end: formatISO(end), label: segLabel || undefined });
			}
		}
	}

	return ranges;
}

// / Find subtitle text above a section header and extract date ranges
function findSectionDateRanges(items: PositionedText[], header: PositionedText): CourseDateRange[] {
	// Look for ALL text items above the section header on the same page.
	// The subtitle may be far above (especially for the second section on a page),
	// so we search all text above the header, not just within a fixed distance.
	const aboveItems = items.filter((item) => {
		if (item.page !== header.page) return false;
		if (item.y >= header.y) return false; // must be above
		return true;
	}).sort((a, b) => b.y - a.y); // closest first (highest Y = closest to header)

	// Find the closest subtitle line that contains date info.
	// Look for text with period labels (Sp1, SpIW, Sp2) and date patterns.
	// Collect all text items from the subtitle line (same Y ± 3 units).
	let subtitleY: number | null = null;
	for (const item of aboveItems) {
		// Only match period-label pattern (e.g. "SpIW : First Intensive Mar 2 - 6 / ...")
		// Avoid loose date pattern which can incorrectly match course titles containing month names
		if (/\b(Sp\w*|SpIW|GFT|Su\w*|F\d)\s*:/i.test(item.text)) {
			// Check this looks like a subtitle (not a title or header)
			if (!/time\s*table/i.test(item.text) && !/^(FMBA|MMS)\s*\(/i.test(item.text)) {
				subtitleY = item.y;
				break;
			}
		}
	}

	if (subtitleY === null) {
		return [];
	}

	// Collect all text at the same Y level (± 3 units) to reconstruct the full subtitle
	const subtitleItems = items.filter((item) => {
		if (item.page !== header.page) return false;
		return Math.abs(item.y - subtitleY!) < 3;
	}).sort((a, b) => a.x - b.x); // left to right

	const subtitleText = subtitleItems.map((c) => c.text).join(' ');

	// Try to infer reference year from nearby text (e.g., "2026 Spring")
	let referenceYear = new Date().getFullYear();
	const yearText = items.find((item) =>
		item.page === header.page &&
		item.y < header.y &&
		/20\d{2}/.test(item.text)
	);
	if (yearText) {
		const ym = yearText.text.match(/20\d{2}/);
		if (ym) referenceYear = parseInt(ym[0], 10);
	}

	return parseSubtitleDateRanges(subtitleText, referenceYear);
}

// / Day name mapping
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_PATTERNS = [
	/^mon(day)?$/i,
	/^tue(s(day)?)?$/i,
	/^wed(nesday)?$/i,
	/^thu(r(s(day)?)?)?$/i,
	/^fri(day)?$/i,
	/^sat(urday)?$/i,
	/^sun(day)?$/i,
];

// / Course code pattern (e.g., GSB5206, MMS5002, GSB5100)
const COURSE_CODE_PATTERN = /^[A-Z]{2,4}\d{4,5}$/;
// / Time patterns
const TIME_PATTERN = /^(\d{1,2}):(\d{2})$/;
const TIME_RANGE_PATTERN = /(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/;
// / Slash-separated format: "Course Name / CODE / Instructor"
const SLASH_FORMAT_PATTERN = /^(.+?)\s*\/\s*([A-Z]{2,4}\d{4,5})\s*\/\s*(.+)$/;

// / Parse a PDF file and extract courses
export async function parsePdfTimetable(file: File): Promise<PdfParseResult> {
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

	// Extract all text items and visual rectangles from all pages
	const allTextItems: PositionedText[] = [];
	const allRects: PdfRect[] = [];
	for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
		const page = await pdf.getPage(pageNum);
		const textContent = await page.getTextContent();
		const viewport = page.getViewport({ scale: 1.0 });

		for (const item of textContent.items) {
			if (isTextItem(item)) {
				const [, , , , x, y] = item.transform;
				const text = item.str.trim();
				if (text.length > 0) {
					allTextItems.push({
						text,
						x,
						y: viewport.height - y, // Flip Y (PDF origin is bottom-left)
						width: item.width,
						height: item.height,
						page: pageNum,
					});
				}
			}
		}

		// Extract visual rectangles (filled/bordered) for visual block detection
		const pageRects = await extractPageRectangles(page, pageNum, viewport.height);
		allRects.push(...pageRects);
	}

	// Build sections
	const sections = buildSections(allTextItems);

	// Extract courses using two strategies
	const allCourses: ParsedCourse[] = [];
	const allProfessors = new Set<string>();

	for (const section of sections) {
		// Strategy 1: Find course codes as anchors (regular grid format)
		const codeBasedCourses = extractByCodeAnchors(allTextItems, section);

		// Strategy 2: Find slash-format entries (intensive week format)
		const slashBasedCourses = extractBySlashFormat(allTextItems, section);

		// Strategy 3: Visual block detection (falls back to text heuristic if no blocks found)
		// Pass all found courses to visual blocks (for color-matching reference),
		// but only pass code-based courses to the text heuristic — slash-format course titles
		// use substring duplicate matching which can wrongly exclude codeless courses
		// (e.g. "Finance Workshop" would suppress "Workshop").
		const foundSoFar = [...codeBasedCourses, ...slashBasedCourses];
		const visualCourses = extractByVisualBlocks(allTextItems, allRects, section, foundSoFar);
		const codelessCourses = visualCourses !== null
			? visualCourses
			: extractCodelessCourses(allTextItems, section, codeBasedCourses);

		const courses = [...codeBasedCourses, ...slashBasedCourses, ...codelessCourses];

		for (const course of courses) {
			allCourses.push(course);
			if (course.instructor) {
				allProfessors.add(course.instructor);
			}
		}
	}

	// Deduplicate courses (same code + same day + same time = same course)
	const deduped = deduplicateCourses(allCourses);

	return {
		courses: deduped,
		extractedProfessors: Array.from(allProfessors).sort(),
		metadata: {
			fileName: file.name,
			pageCount: pdf.numPages,
			sectionsFound: sections.length,
		},
	};
}

// / Type guard for TextItem
function isTextItem(item: TextItem | TextMarkedContent): item is TextItem {
	return 'str' in item;
}

// / Build table sections from text items
function buildSections(items: PositionedText[]): TableSection[] {
	const sections: TableSection[] = [];

	// Find section headers: "FMBA (9B114)" or "MMS (90104)"
	const sectionHeaders = items.filter((item) =>
		/^(FMBA|MMS)\s*\([^)]+\)\s*$/i.test(item.text)
	);

	for (const header of sectionHeaders) {
		const program: ProgramType = header.text.toUpperCase().includes('FMBA') ? 'FMBA' : 'MMS';
		const roomMatch = header.text.match(/\(([^)]+)\)/);
		const room = roomMatch ? roomMatch[1].trim() : '';

		// Find day columns near this header (within ±15 Y units)
		const dayColumns = findDayColumns(items, header);
		if (dayColumns.length < 3) continue;

		// Find the end of this section
		const endY = findSectionEnd(header, sectionHeaders, items);

		// Find time slots within this section
		const timeSlots = findTimeSlots(items, header, dayColumns[0].xStart, endY);

		// Extract date ranges from subtitle above the section header
		const dateRanges = findSectionDateRanges(items, header);

		sections.push({
			program,
			room,
			headerY: header.y,
			endY,
			page: header.page,
			dayColumns,
			timeSlots,
			dateRanges,
		});
	}

	return sections;
}

// / Find day columns near a section header
function findDayColumns(items: PositionedText[], header: PositionedText): DayColumn[] {
	const columns: DayColumn[] = [];

	const nearby = items.filter(
		(item) =>
			item.page === header.page &&
			Math.abs(item.y - header.y) < 15
	);

	for (const item of nearby) {
		const dayIdx = DAY_PATTERNS.findIndex((p) => p.test(item.text));
		if (dayIdx !== -1) {
			columns.push({
				day: DAY_NAMES[dayIdx],
				xCenter: item.x + item.width / 2,
				xStart: item.x - 10,
				xEnd: item.x + item.width + 50,
			});
		}
	}

	columns.sort((a, b) => a.xStart - b.xStart);

	// Refine boundaries using midpoints
	for (let i = 0; i < columns.length - 1; i++) {
		const mid = (columns[i].xEnd + columns[i + 1].xStart) / 2;
		columns[i].xEnd = mid;
		columns[i + 1].xStart = mid;
	}
	if (columns.length > 0) {
		columns[columns.length - 1].xEnd = 700; // extend last column
	}

	return columns;
}

// / Find the Y where a section ends
function findSectionEnd(
	header: PositionedText,
	allHeaders: PositionedText[],
	items: PositionedText[]
): number {
	const next = allHeaders
		.filter((h) => h.page === header.page && h.y > header.y + 30 && h !== header)
		.sort((a, b) => a.y - b.y)[0];

	if (next) return next.y - 10;

	// Bottom of page content
	const pageItems = items.filter((i) => i.page === header.page);
	return Math.max(...pageItems.map((i) => i.y + i.height)) + 20;
}

// / Find time slots in a section
function findTimeSlots(
	items: PositionedText[],
	header: PositionedText,
	leftBound: number,
	endY: number
): TimeSlot[] {
	const slots: TimeSlot[] = [];

	// Find time-like items in the left column
	const timeItems = items.filter((item) => {
		if (item.page !== header.page) return false;
		if (item.x > leftBound) return false;
		if (item.y < header.y) return false;
		if (item.y > endY) return false;
		return TIME_PATTERN.test(item.text) || TIME_RANGE_PATTERN.test(item.text);
	}).sort((a, b) => a.y - b.y);

	let i = 0;
	while (i < timeItems.length) {
		const item = timeItems[i];

		// Already a range: "9:00 - 10:15"
		const rangeMatch = item.text.match(TIME_RANGE_PATTERN);
		if (rangeMatch) {
			slots.push({
				startTime: normalizeTime(rangeMatch[1]),
				endTime: normalizeTime(rangeMatch[2]),
				yCenter: item.y,
			});
			i++;
			continue;
		}

		// Pair sequential individual times: first=start, second=end
		if (i + 1 < timeItems.length && !TIME_RANGE_PATTERN.test(timeItems[i + 1].text)) {
			slots.push({
				startTime: normalizeTime(item.text),
				endTime: normalizeTime(timeItems[i + 1].text),
				yCenter: (item.y + timeItems[i + 1].y) / 2,
			});
			i += 2;
			continue;
		}

		i++;
	}

	return slots;
}

// / Normalize time to HH:MM
function normalizeTime(t: string): string {
	const m = t.match(/^(\d{1,2}):(\d{2})$/);
	return m ? `${m[1].padStart(2, '0')}:${m[2]}` : t;
}

// / Strategy 1: Extract courses by finding course code anchors
function extractByCodeAnchors(items: PositionedText[], section: TableSection): ParsedCourse[] {
	const courseMap = new Map<string, ParsedCourse>();

	// Find all course codes within this section
	const codeItems = items.filter((item) => {
		if (item.page !== section.page) return false;
		if (item.y < section.headerY) return false;
		if (item.y > section.endY) return false;
		// Must be in the grid area (not in the time column)
		if (section.dayColumns.length > 0 && item.x < section.dayColumns[0].xStart) return false;
		return COURSE_CODE_PATTERN.test(item.text);
	});

	for (const codeItem of codeItems) {
		const courseCode = codeItem.text;

		// Determine which day column this code falls in
		const day = findDayForX(codeItem.x, section.dayColumns);
		if (!day) continue;

		// Determine which time slot this code falls in
		const timeSlot = findTimeSlotForY(codeItem.y, section.timeSlots);
		if (!timeSlot) continue;

		// Find the title: text items ABOVE the code, in the same column area, close in Y
		const title = findTitleAboveCode(items, codeItem, section);

		// Find the instructor: text item BELOW the code, in the same column area, close in Y
		const instructor = findInstructorBelowCode(items, codeItem, section);

		if (!title) continue;

		// Deduplicate key: same course taught at same time on different days = same course
		const courseKey = `${courseCode}-${title}-${section.program}`;

		const meetingSlot: MeetingSlot = {
			day,
			dayCode: day.slice(0, 3),
			startTime: timeSlot.startTime,
			endTime: timeSlot.endTime,
			room: section.room,
		};

		if (courseMap.has(courseKey)) {
			const existing = courseMap.get(courseKey)!;
			const isDup = existing.meetingSlots.some(
				(s) => s.day === meetingSlot.day && s.startTime === meetingSlot.startTime
			);
			if (!isDup) {
				existing.meetingSlots.push(meetingSlot);
			}
		} else {
			courseMap.set(courseKey, {
				id: generateCourseId(courseCode),
				courseCode,
				courseTitle: title,
				instructor: instructor || '',
				credits: '',
				campus: '',
				meetingSlots: [meetingSlot],
				confidence: 'high',
				reasons: ['Parsed from PDF timetable grid'],
				sourceRows: [0, 0, 0],
				rawTimeRoom: `${day} ${timeSlot.startTime}-${timeSlot.endTime}`,
				program: section.program,
				dateRanges: section.dateRanges.length > 0 ? [...section.dateRanges] : undefined,
			});
		}
	}

	return Array.from(courseMap.values());
}

// / Strategy 2: Extract courses from slash-format entries (intensive weeks)
// Intensive week courses use "Title / CODE / Instructor" format and span Mon-Fri.
// They also span multiple time slots (e.g., 9:00-14:15 across 3 session blocks).
function extractBySlashFormat(items: PositionedText[], section: TableSection): ParsedCourse[] {
	const courses: ParsedCourse[] = [];

	const slashItems = items.filter((item) => {
		if (item.page !== section.page) return false;
		if (item.y < section.headerY) return false;
		if (item.y > section.endY) return false;
		return SLASH_FORMAT_PATTERN.test(item.text);
	});

	// Group adjacent time slots into contiguous blocks
	// (e.g., 9:00-10:15, 10:30-11:45, 13:00-14:15 form one block)
	const timeGroups = groupAdjacentTimeSlots(section.timeSlots);

	for (const item of slashItems) {
		const match = item.text.match(SLASH_FORMAT_PATTERN);
		if (!match) continue;

		const title = match[1].trim();
		const code = match[2].trim();
		const instructor = match[3].trim();

		// Find which time group this course belongs to (by Y proximity)
		const timeGroup = findTimeGroupForY(item.y, timeGroups);
		if (!timeGroup) continue;

		// Intensive week courses always run Mon-Fri
		const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

		// Use the full time range of the group (first slot start → last slot end)
		const meetingSlots: MeetingSlot[] = days.map((day) => ({
			day,
			dayCode: day.slice(0, 3),
			startTime: timeGroup.startTime,
			endTime: timeGroup.endTime,
			room: section.room,
		}));

		// Look for a date annotation below (e.g., "(Mar 2 - 6)")
		const dateAnnotation = findDateAnnotation(items, item);

		// Determine per-course date ranges:
		// 1. If there's a specific date annotation, parse it into a CourseDateRange
		// 2. Otherwise fall back to the section's date ranges
		let courseDateRanges: CourseDateRange[] | undefined;
		if (dateAnnotation) {
			// Infer reference year from section date ranges or current year
			const refYear = section.dateRanges.length > 0
				? new Date(section.dateRanges[0].start).getFullYear()
				: new Date().getFullYear();
			// Parse the annotation text (strip parens)
			const annotText = dateAnnotation.replace(/[()]/g, '').trim();
			const parsed = parseSubtitleDateRanges(annotText, refYear);
			if (parsed.length > 0) {
				// The annotation text (e.g. "Mar 2 - 6") has no period label, so inherit
				// the matching label from the section's dateRanges by date overlap.
				courseDateRanges = parsed.map(p => {
					if (p.label) return p;
					const match = section.dateRanges.find(
						sr => sr.start <= p.end && sr.end >= p.start
					);
					return match ? { ...p, label: match.label } : p;
				});
			}
		}
		if (!courseDateRanges && section.dateRanges.length > 0) {
			courseDateRanges = [...section.dateRanges];
		}

		courses.push({
			id: generateCourseId(code),
			courseCode: code,
			courseTitle: title + (dateAnnotation ? ` ${dateAnnotation}` : ''),
			instructor,
			credits: '',
			campus: '',
			meetingSlots,
			confidence: 'high',
			reasons: ['Parsed from PDF timetable (intensive week format)'],
			sourceRows: [0, 0, 0],
			rawTimeRoom: `Mon-Fri ${timeGroup.startTime}-${timeGroup.endTime}`,
			program: section.program,
			dateRanges: courseDateRanges,
		});
	}

	return courses;
}

// / Strategy 3a: Extract codeless courses using visual block detection.
// # Finds rectangles in the PDF grid that match the color/border style of already-extracted
// # course cells, then extracts text from unclaimed matching rectangles as new courses.
// # Returns null if no visual blocks are detectable (triggers text-heuristic fallback).
function extractByVisualBlocks(
	items: PositionedText[],
	allRects: PdfRect[],
	section: TableSection,
	alreadyFound: ParsedCourse[]
): ParsedCourse[] | null {
	if (section.dayColumns.length === 0 || section.timeSlots.length === 0) return null;

	const gridXStart = section.dayColumns[0].xStart;
	const gridXEnd = section.dayColumns[section.dayColumns.length - 1].xEnd;
	const gridWidth = gridXEnd - gridXStart;

	// Filter rectangles to those inside this section's grid area
	const sectionRects = allRects.filter((r) => {
		if (r.page !== section.page) return false;
		if (r.y + r.height < section.headerY || r.y > section.endY) return false;
		// Must overlap with the day-column X range
		if (r.x + r.width < gridXStart - 10 || r.x > gridXEnd + 10) return false;
		return true;
	});

	// Remove lines and full-width separators; keep only cell-sized rectangles
	const cellRects = sectionRects.filter(
		(r) => r.width >= 10 && r.height >= 10 && r.width < gridWidth * 0.85
	);

	if (cellRects.length === 0) {
		return null;
	}

	// Check if a text item's position falls inside a rectangle (with small tolerance)
	function textInRect(t: PositionedText, r: PdfRect, tol = 4): boolean {
		return (
			t.page === r.page &&
			t.x + tol >= r.x &&
			t.x + t.width - tol <= r.x + r.width &&
			t.y + tol >= r.y &&
			t.y + t.height - tol <= r.y + r.height
		);
	}

	// Identify "known course cell" colors by finding rects that contain text from
	// already-found courses (Strategy 1 / Strategy 2)
	const knownFillColors: RGBColor[] = [];
	const knownStrokeColors: RGBColor[] = [];
	const knownText = new Set<string>(
		alreadyFound.flatMap((c) => [c.courseCode, c.courseTitle, c.instructor].filter(Boolean))
	);

	for (const rect of cellRects) {
		const hasKnownText = items.some(
			(t) => t.page === section.page && knownText.has(t.text) && textInRect(t, rect)
		);
		if (!hasKnownText) continue;

		if (rect.fillColor && !isNearWhite(rect.fillColor)) {
			if (!knownFillColors.some((c) => colorsMatch(c, rect.fillColor!))) {
				knownFillColors.push(rect.fillColor);
			}
		}
		if (rect.strokeColor && !isNearWhite(rect.strokeColor)) {
			if (!knownStrokeColors.some((c) => colorsMatch(c, rect.strokeColor!))) {
				knownStrokeColors.push(rect.strokeColor);
			}
		}
	}

	// If no known colors found, check whether there's any visual structure at all
	const hasVisualStructure = cellRects.some(
		(r) =>
			(r.fillColor && !isNearWhite(r.fillColor)) ||
			(r.strokeColor && !isNearWhite(r.strokeColor))
	);
	if (!hasVisualStructure) {
		return null; // No visual blocks — fall back to text heuristic
	}

	// Determine whether a rect looks like a course cell (matches known colors or has structure)
	function isCourseCell(r: PdfRect): boolean {
		if (r.fillColor && knownFillColors.some((k) => colorsMatch(k, r.fillColor!))) return true;
		if (r.strokeColor && knownStrokeColors.some((k) => colorsMatch(k, r.strokeColor!))) return true;
		// If no known colors established yet (all courses are codeless), accept any colored rect
		if (knownFillColors.length === 0 && r.fillColor && !isNearWhite(r.fillColor)) return true;
		if (knownStrokeColors.length === 0 && r.strokeColor && !isNearWhite(r.strokeColor) && r.width >= 30 && r.height >= 15) return true;
		return false;
	}

	// Build courses from unclaimed course-cell rectangles
	const courseMap = new Map<string, ParsedCourse>();

	for (const rect of cellRects) {
		if (!isCourseCell(rect)) continue;

		// Skip if this rect already contains text from a known course
		const containsKnown = items.some(
			(t) => t.page === section.page && knownText.has(t.text) && textInRect(t, rect)
		);
		if (containsKnown) continue;

		// Determine day and time slot from rect center position
		const cx = rect.x + rect.width / 2;
		const cy = rect.y + rect.height / 2;
		const day = findDayForX(cx, section.dayColumns);
		const slot = findTimeSlotForY(cy, section.timeSlots);
		if (!day || !slot) continue;

		// Collect text items inside this rect, sorted top-to-bottom
		const cellText = items
			.filter(
				(t) =>
					t.page === section.page &&
					textInRect(t, rect) &&
					!TIME_PATTERN.test(t.text) &&
					!TIME_RANGE_PATTERN.test(t.text) &&
					!HEADER_METADATA_PATTERN.test(t.text) &&
					t.text.length >= 2
			)
			.sort((a, b) => a.y - b.y);

		// Check for a course code embedded in the cell
		const codeItem = cellText.find((t) => COURSE_CODE_PATTERN.test(t.text));
		const contentItems = cellText.filter((t) => t !== codeItem);

		if (contentItems.length === 0 && !codeItem) continue;

		const title = contentItems.map((t) => t.text).join(' ').trim();
		if (!title && !codeItem) continue;

		// Skip assembled titles that look like pure person names (no course hints)
		const displayTitle = title || codeItem?.text || '';
		const hasCourseHint = /[()0-9]/.test(displayTitle) || displayTitle.length > 25;
		if (
			!hasCourseHint &&
			/^[A-Za-z\s\-'.]+$/.test(displayTitle) &&
			displayTitle.split(/\s+/).length >= 2 &&
			displayTitle.split(/\s+/).length <= 4
		) {
			continue;
		}

		// Skip if title duplicates an already-found course
		const lowerTitle = displayTitle.toLowerCase();
		const isDup = alreadyFound.some((c) => {
			const et = c.courseTitle.toLowerCase();
			return et === lowerTitle || et.includes(lowerTitle) || lowerTitle.includes(et);
		});
		if (isDup) continue;

		const meetingSlot: MeetingSlot = {
			day,
			dayCode: day.slice(0, 3),
			startTime: slot.startTime,
			endTime: slot.endTime,
			room: section.room,
		};

		const courseKey = `${displayTitle}-${section.program}`;
		if (courseMap.has(courseKey)) {
			const existing = courseMap.get(courseKey)!;
			const isDupSlot = existing.meetingSlots.some(
				(s) => s.day === meetingSlot.day && s.startTime === meetingSlot.startTime
			);
			if (!isDupSlot) existing.meetingSlots.push(meetingSlot);
		} else {
			courseMap.set(courseKey, {
				id: generateCourseId(displayTitle.replace(/\s+/g, '-')),
				courseCode: codeItem?.text || '',
				courseTitle: displayTitle,
				instructor: '',
				credits: '',
				campus: '',
				meetingSlots: [meetingSlot],
				confidence: 'medium',
				reasons: ['Parsed from PDF visual cell (matched course-cell color/border)'],
				sourceRows: [0, 0, 0],
				rawTimeRoom: `${day} ${slot.startTime}-${slot.endTime}`,
				program: section.program,
				dateRanges: section.dateRanges.length > 0 ? [...section.dateRanges] : undefined,
			});
		}
	}

	const results = Array.from(courseMap.values());
	// Only "win" if visual detection actually found courses.
	// Return null in all other cases so the text-heuristic fallback always runs
	// when visual blocks yield nothing (coordinates off, unexpected colors, etc.).
	return results.length > 0 ? results : null;
}

// / Strategy 3b (text-heuristic fallback): Extract courses that have no course code in the grid.
// These are identified by finding title-like text in day columns near time slots
// that aren't already claimed by a code-anchored course.
function extractCodelessCourses(
	items: PositionedText[],
	section: TableSection,
	alreadyFound: ParsedCourse[]
): ParsedCourse[] {
	const gridTopY = section.headerY + 5;

	// Build sets of known text from already-extracted courses for filtering
	const knownInstructors = new Set<string>();
	const knownTitles: string[] = [];
	for (const course of alreadyFound) {
		if (course.instructor) knownInstructors.add(course.instructor.trim().toLowerCase());
		if (course.courseTitle) knownTitles.push(course.courseTitle.toLowerCase());
	}

	// Collect all course code items in this section for proximity-based claiming
	const codeItems = items.filter((item) => {
		if (item.page !== section.page) return false;
		if (item.y < section.headerY || item.y > section.endY) return false;
		return COURSE_CODE_PATTERN.test(item.text);
	});

	// Check if a position is claimed by a code-anchored course.
	// Uses direct X-proximity (≤40 px) rather than column-boundary maps:
	// title/instructor fragments are always within ~25 px of their code, whereas
	// cross-column distances are ≥60 px — 40 px is a safe threshold.
	function isClaimedByCode(x: number, y: number): boolean {
		const candidateSlot = findTimeSlotForY(y, section.timeSlots);
		if (!candidateSlot) return false;
		for (const ci of codeItems) {
			if (Math.abs(x - ci.x) > 40) continue; // different column
			const codeSlot = findTimeSlotForY(ci.y, section.timeSlots);
			if (codeSlot && codeSlot.startTime === candidateSlot.startTime) return true;
		}
		return false;
	}

	// Find candidate title items in the grid area
	const candidates = items.filter((item) => {
		if (item.page !== section.page) return false;
		if (item.y < gridTopY || item.y > section.endY) return false;
		// Must be in the grid area (not the time column).
		// Allow up to 15px left of the first column's xStart — first-column content
		// (e.g. Business Korean(A)) is sometimes positioned slightly left of the detected boundary.
		if (section.dayColumns.length > 0 && item.x < section.dayColumns[0].xStart - 15) return false;
		// Exclude known patterns
		if (COURSE_CODE_PATTERN.test(item.text)) return false;
		if (TIME_PATTERN.test(item.text)) return false;
		if (TIME_RANGE_PATTERN.test(item.text)) return false;
		if (DAY_PATTERNS.some((p) => p.test(item.text))) return false;
		if (/^(FMBA|MMS)\s*\(/i.test(item.text)) return false;
		if (HEADER_METADATA_PATTERN.test(item.text)) return false;
		if (/^\(.*\d.*\)$/.test(item.text)) return false;
		if (SLASH_FORMAT_PATTERN.test(item.text)) return false;
		// Must be a meaningful title (at least 3 chars, not just a single letter/number)
		if (item.text.length < 3) return false;
		// Exclude items whose text exactly matches a known instructor name
		if (knownInstructors.has(item.text.trim().toLowerCase())) return false;
		return true;
	});

	// Group candidates by (day column, time slot) cell
	const cellMap = new Map<string, PositionedText[]>();
	for (const item of candidates) {
		const day = findDayForX(item.x, section.dayColumns);
		const slot = findTimeSlotForY(item.y, section.timeSlots);
		if (!day || !slot) {
			continue;
		}

		// Skip if this item is in the same (column, time slot) as a course code (claimed by strategy 1)
		if (isClaimedByCode(item.x, item.y)) {
			continue;
		}

		const groupKey = `${day}-${slot.startTime}`;
		if (!cellMap.has(groupKey)) cellMap.set(groupKey, []);
		cellMap.get(groupKey)!.push(item);
	}

	// For each unclaimed cell group, try to form a course
	// Collect skipped person-name items for post-processing instructor assignment
	const skippedPersonNames: { text: string; avgX: number; slotStartTime: string }[] = [];
	const courseGroupAvgX = new Map<string, number>(); // courseKey → avg X of accepted group
	const courseMap = new Map<string, ParsedCourse>();
	for (const [groupKey, cellItems] of cellMap) {
		// Sort by Y position (top to bottom)
		cellItems.sort((a, b) => a.y - b.y);
		if (cellItems.length === 0) continue;

		// Separate instructor from title: last item is instructor if it looks like a person
		// name (2–4 alpha words) AND there is at least one other item to form the title.
		// We no longer require the name to already be in knownInstructors — codeless courses
		// (like Business Korean) have instructors that haven't been seen by Strategy 1.
		let titleParts = cellItems.map(i => i.text);
		let instructor = '';
		if (cellItems.length >= 2) {
			const lastText = cellItems[cellItems.length - 1].text;
			const looksLikeName = /^[A-Za-z\s\-'.]+$/.test(lastText) &&
				lastText.split(/\s+/).length >= 2 &&
				lastText.split(/\s+/).length <= 4;
			if (looksLikeName) {
				instructor = lastText;
				titleParts = cellItems.slice(0, -1).map(i => i.text);
			}
		}

		const title = titleParts.join(' ').trim();
		if (!title) continue;

		// Skip assembled titles that look like person names (all alpha, 2-4 words, no course hints)
		const hasCourseTitleHint = /[()0-9]/.test(title) || title.length > 25;
		if (!hasCourseTitleHint && /^[A-Za-z\s\-'.]+$/.test(title) &&
			title.split(/\s+/).length >= 2 && title.split(/\s+/).length <= 4) {
			const pnAvgX = cellItems.reduce((s, i) => s + i.x, 0) / cellItems.length;
			const pnAvgY = cellItems.reduce((s, i) => s + i.y, 0) / cellItems.length;
			const pnSlot = findTimeSlotForY(pnAvgY, section.timeSlots);
			if (pnSlot) skippedPersonNames.push({ text: title, avgX: pnAvgX, slotStartTime: pnSlot.startTime });
			continue;
		}

		// Skip if title matches or overlaps with any already-found course
		const lowerTitle = title.toLowerCase();
		const isDuplicate = alreadyFound.some((c) => {
			const existingTitle = c.courseTitle.toLowerCase();
			return existingTitle === lowerTitle ||
				existingTitle.includes(lowerTitle) ||
				lowerTitle.includes(existingTitle);
		});
		if (isDuplicate) {
			continue;
		}

		// Also skip if it matches a codeless course we already built in this run
		const existingCodeless = Array.from(courseMap.values());
		const isDupCodeless = existingCodeless.some((c) => {
			const t = c.courseTitle.toLowerCase();
			return t === lowerTitle || t.includes(lowerTitle) || lowerTitle.includes(t);
		});
		if (isDupCodeless) {
			continue;
		}

		const groupAvgX = cellItems.reduce((s, i) => s + i.x, 0) / cellItems.length;
		const day = groupKey.split('-')[0];
		const startTime = groupKey.split('-').slice(1).join('-');
		const slotIdx = section.timeSlots.findIndex(s => s.startTime === startTime);
		const slot = slotIdx >= 0 ? section.timeSlots[slotIdx] : null;
		if (!slot) continue;

		// Detect multi-slot cells: if the group's items sit near the midpoint between
		// this slot and the next (e.g., Workshop spanning 09:00–12:30 across two slots),
		// extend the end time to cover both slots.
		let effectiveEndTime = slot.endTime;
		if (slotIdx + 1 < section.timeSlots.length) {
			const nextSlot = section.timeSlots[slotIdx + 1];
			const midY = (slot.yCenter + nextSlot.yCenter) / 2;
			const avgItemY = cellItems.reduce((s, i) => s + i.y, 0) / cellItems.length;
			if (Math.abs(avgItemY - midY) <= 15) {
				effectiveEndTime = nextSlot.endTime;
			}
		}

		const meetingSlot: MeetingSlot = {
			day,
			dayCode: day.slice(0, 3),
			startTime: slot.startTime,
			endTime: effectiveEndTime,
			room: section.room,
		};

		// Merge into existing course if same title
		const courseKey = `${title}-${section.program}`;
		if (courseMap.has(courseKey)) {
			const existing = courseMap.get(courseKey)!;
			const isDup = existing.meetingSlots.some(
				(s) => s.day === meetingSlot.day && s.startTime === meetingSlot.startTime
			);
			if (!isDup) {
				existing.meetingSlots.push(meetingSlot);
			}
		} else {
			courseGroupAvgX.set(courseKey, groupAvgX);
			courseMap.set(courseKey, {
				id: generateCourseId(title.replace(/\s+/g, '-')),
				courseCode: '',
				courseTitle: title,
				instructor: instructor || '',
				credits: '',
				campus: '',
				meetingSlots: [meetingSlot],
				confidence: 'medium',
				reasons: ['Parsed from PDF timetable grid (no course code found)'],
				sourceRows: [0, 0, 0],
				rawTimeRoom: `${day} ${slot.startTime}-${effectiveEndTime}`,
				program: section.program,
				dateRanges: section.dateRanges.length > 0 ? [...section.dateRanges] : undefined,
			});
		}
	}

	// Post-process: assign instructors to courses that lack one,
	// by finding nearby person-name items that were skipped during grouping.
	// Handles cases where the instructor is in a slightly different column group
	// (e.g. Business Korean(B) at x=305 and Yeoshil Ma at x=318 spanning a column boundary).
	for (const [courseKey, course] of courseMap) {
		if (course.instructor) continue;
		const courseAvgX = courseGroupAvgX.get(courseKey) ?? 0;
		for (const slot of course.meetingSlots) {
			for (const pn of skippedPersonNames) {
				if (pn.slotStartTime !== slot.startTime) continue;
				if (Math.abs(pn.avgX - courseAvgX) > 60) continue;
				course.instructor = pn.text;
				break;
			}
			if (course.instructor) break;
		}
	}

	return Array.from(courseMap.values());
}

// / A group of adjacent time slots with an overall start/end
interface TimeGroup {
	startTime: string;
	endTime: string;
	yMin: number;
	yMax: number;
	slots: TimeSlot[];
}

// / Group adjacent time slots into contiguous blocks
function groupAdjacentTimeSlots(slots: TimeSlot[]): TimeGroup[] {
	if (slots.length === 0) return [];

	const sorted = [...slots].sort((a, b) => a.yCenter - b.yCenter);
	const groups: TimeGroup[] = [];
	let currentGroup: TimeGroup = {
		startTime: sorted[0].startTime,
		endTime: sorted[0].endTime,
		yMin: sorted[0].yCenter,
		yMax: sorted[0].yCenter,
		slots: [sorted[0]],
	};

	for (let i = 1; i < sorted.length; i++) {
		const slot = sorted[i];
		const gap = slot.yCenter - currentGroup.yMax;

		// If gap between slots is small (< 60 units), they're in the same group
		if (gap < 60) {
			currentGroup.endTime = slot.endTime;
			currentGroup.yMax = slot.yCenter;
			currentGroup.slots.push(slot);
		} else {
			// Start a new group
			groups.push(currentGroup);
			currentGroup = {
				startTime: slot.startTime,
				endTime: slot.endTime,
				yMin: slot.yCenter,
				yMax: slot.yCenter,
				slots: [slot],
			};
		}
	}
	groups.push(currentGroup);

	return groups;
}

// / Find which time group a Y position falls nearest to
function findTimeGroupForY(y: number, groups: TimeGroup[]): TimeGroup | null {
	let nearest: TimeGroup | null = null;
	let minDist = Infinity;

	for (const group of groups) {
		// Distance from Y to the group's range
		let dist: number;
		if (y >= group.yMin && y <= group.yMax) {
			dist = 0; // inside the group
		} else {
			dist = Math.min(Math.abs(y - group.yMin), Math.abs(y - group.yMax));
		}

		if (dist < minDist) {
			minDist = dist;
			nearest = group;
		}
	}

	return minDist < 150 ? nearest : null;
}

// / Find which day a given X position falls in
function findDayForX(x: number, columns: DayColumn[]): string | null {
	for (const col of columns) {
		if (x >= col.xStart && x <= col.xEnd) {
			return col.day;
		}
	}
	// Fallback: find nearest column
	let nearest = columns[0];
	let minDist = Infinity;
	for (const col of columns) {
		const dist = Math.abs(x - col.xCenter);
		if (dist < minDist) {
			minDist = dist;
			nearest = col;
		}
	}
	return minDist < 100 ? nearest.day : null;
}

// / Find which time slot a given Y position falls in
function findTimeSlotForY(y: number, slots: TimeSlot[]): TimeSlot | null {
	// Find the closest time slot by Y
	let nearest: TimeSlot | null = null;
	let minDist = Infinity;
	for (const slot of slots) {
		const dist = Math.abs(y - slot.yCenter);
		if (dist < minDist) {
			minDist = dist;
			nearest = slot;
		}
	}
	// Must be within a reasonable distance
	return minDist < 100 ? nearest : null;
}

// / Pattern to detect header/metadata text that should never be part of a course title
const HEADER_METADATA_PATTERN = /break|holiday|vacation|lunar|new year|semester|intensive|spring|summer|fall|winter|sp\d|:\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i;

// / Find course title text above a course code
function findTitleAboveCode(
	items: PositionedText[],
	codeItem: PositionedText,
	section: TableSection
): string {
	// The grid content area starts below the day header row.
	// Day headers are at approximately section.headerY (±15 units).
	// Only search for title text below the header row.
	const gridTopY = section.headerY + 5;

	// Look for text items above the code, within ~50 Y units, in similar X region
	const candidates = items.filter((item) => {
		if (item.page !== codeItem.page) return false;
		if (item === codeItem) return false;
		// Must be above the code (lower Y value = higher on page in flipped coords)
		if (item.y >= codeItem.y) return false;
		// Must be close above (within 50 units)
		if (codeItem.y - item.y > 50) return false;
		// Must be BELOW the header/day row (inside the grid)
		if (item.y < gridTopY) return false;
		// Must be in similar X region (within the same column, roughly)
		if (Math.abs(item.x - codeItem.x) > 40) return false;
		// Exclude other course codes, times, days
		if (COURSE_CODE_PATTERN.test(item.text)) return false;
		if (TIME_PATTERN.test(item.text)) return false;
		if (TIME_RANGE_PATTERN.test(item.text)) return false;
		if (DAY_PATTERNS.some((p) => p.test(item.text))) return false;
		// Exclude section headers
		if (/^(FMBA|MMS)\s*\(/i.test(item.text)) return false;
		// Exclude header metadata (dates, breaks, semester labels)
		if (HEADER_METADATA_PATTERN.test(item.text)) return false;
		// Exclude parenthesized date annotations
		if (/^\(.*\d.*\)$/.test(item.text)) return false;
		return true;
	}).sort((a, b) => a.y - b.y); // sort top to bottom

	if (candidates.length === 0) return '';

	// Concatenate the title lines
	return candidates.map((c) => c.text).join(' ').trim();
}

// / Find instructor name below a course code
function findInstructorBelowCode(
	items: PositionedText[],
	codeItem: PositionedText,
	section: TableSection
): string {
	// Look for text items below the code, within ~25 Y units, in similar X region
	const candidates = items.filter((item) => {
		if (item.page !== codeItem.page) return false;
		if (item === codeItem) return false;
		// Must be below the code
		if (item.y <= codeItem.y) return false;
		// Must be close below (within 25 units — instructor is right below code)
		if (item.y - codeItem.y > 25) return false;
		// Must be in similar X region
		if (Math.abs(item.x - codeItem.x) > 40) return false;
		// Exclude course codes, times, days
		if (COURSE_CODE_PATTERN.test(item.text)) return false;
		if (TIME_PATTERN.test(item.text)) return false;
		if (TIME_RANGE_PATTERN.test(item.text)) return false;
		if (DAY_PATTERNS.some((p) => p.test(item.text))) return false;
		return true;
	}).sort((a, b) => a.y - b.y);

	if (candidates.length === 0) return '';

	// Usually just one line for instructor, but could be two
	return candidates.map((c) => c.text).join(' ').trim();
}

// / Find a date annotation below an item (e.g., "(Mar 2 - 6)")
function findDateAnnotation(
	items: PositionedText[],
	parentItem: PositionedText,
): string {
	const annotation = items.find((item) => {
		if (item.page !== parentItem.page) return false;
		if (item.y <= parentItem.y) return false;
		if (item.y - parentItem.y > 30) return false;
		return /^\(.*\d.*\)$/.test(item.text);
	});
	return annotation ? annotation.text : '';
}

// / Deduplicate courses: merge courses with same code + title into one
function deduplicateCourses(courses: ParsedCourse[]): ParsedCourse[] {
	const map = new Map<string, ParsedCourse>();

	for (const course of courses) {
		const key = `${course.courseCode}-${course.courseTitle}-${course.program}`;
		if (map.has(key)) {
			const existing = map.get(key)!;
			for (const slot of course.meetingSlots) {
				const isDup = existing.meetingSlots.some(
					(s) => s.day === slot.day && s.startTime === slot.startTime
				);
				if (!isDup) {
					existing.meetingSlots.push(slot);
				}
			}
			// Merge instructor if missing
			if (!existing.instructor && course.instructor) {
				existing.instructor = course.instructor;
			}
			// Merge dateRanges from different sections (e.g., same course in Sp1 and Sp2)
			if (course.dateRanges && course.dateRanges.length > 0) {
				if (!existing.dateRanges) existing.dateRanges = [];
				for (const range of course.dateRanges) {
					const isDup = existing.dateRanges.some(
						(r) => r.start === range.start && r.end === range.end
					);
					if (!isDup) {
						existing.dateRanges.push(range);
					}
				}
			}
		} else {
			map.set(key, { ...course, meetingSlots: [...course.meetingSlots] });
		}
	}

	return Array.from(map.values());
}

// / Generate a unique course ID
let courseIdCounter = 0;
function generateCourseId(code: string): string {
	courseIdCounter++;
	const slug = code.toLowerCase().replace(/[^a-z0-9]/g, '');
	return `pdf-${slug}-${Date.now().toString(36)}-${courseIdCounter}`;
}
