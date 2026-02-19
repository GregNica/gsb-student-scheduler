// @ Grid-format Excel schedule reader
// # Purpose: Parse Excel timetables laid out as a grid (days as columns, times as rows)
// # rather than the standard SKKU 3-row-per-course block format.
// # Used as a fallback in scheduleScannerMain.ts when the block format produces no results.

import * as XLSX from 'xlsx';
import type { ParsedCourse, MeetingSlot } from './scheduleParser';

// / Result from the grid-format Excel parser
export interface GridExcelResult {
	courses: ParsedCourse[];
	sheetName: string;
	metadata: {
		fileName: string;
		fileSize: number;
		extractedAt: Date;
		totalDataRows: number;
		detectedCourses: number;
	};
}

// Day name patterns for grid detection and mapping
const DAY_ABBREVS: Record<string, string> = {
	mon: 'Monday', monday: 'Monday',
	tue: 'Tuesday', tues: 'Tuesday', tuesday: 'Tuesday',
	wed: 'Wednesday', wednesday: 'Wednesday',
	thu: 'Thursday', thur: 'Thursday', thurs: 'Thursday', thursday: 'Thursday',
	fri: 'Friday', friday: 'Friday',
	sat: 'Saturday', saturday: 'Saturday',
	sun: 'Sunday', sunday: 'Sunday',
};

// / True if a cell string is a day name (abbreviated or full)
function isDayName(s: string): boolean {
	return Object.prototype.hasOwnProperty.call(DAY_ABBREVS, s.toLowerCase().trim());
}

// / Resolve a cell string to a full English day name, or null
function resolveDayName(s: string): string | null {
	return DAY_ABBREVS[s.toLowerCase().trim()] ?? null;
}

// / True if a cell string looks like a time value ("9:00", "09:00", "9:00-10:30")
const TIME_CELL_RE = /^\d{1,2}:\d{2}([-–]\d{1,2}:\d{2})?$/;
function isTimeCell(s: string): boolean {
	return TIME_CELL_RE.test(s.trim());
}

// / True if a cell string looks like a course code (e.g., GSB5100, MMS5002)
const COURSE_CODE_RE = /^[A-Z]{2,4}\d{4,5}$/;

// / Check whether raw sheet data looks like a grid-format timetable.
// # A grid format has a row with 3+ day names and a column with 2+ time values.
export function isGridFormat(rawData: (string | number | null)[][]): boolean {
	if (rawData.length < 4) return false;

	// Scan first 10 rows for a row containing 3+ day names
	let dayHeaderRowIdx = -1;
	for (let r = 0; r < Math.min(10, rawData.length); r++) {
		const row = rawData[r] ?? [];
		const dayCount = row.filter((cell) => isDayName(String(cell ?? '').trim())).length;
		if (dayCount >= 3) {
			dayHeaderRowIdx = r;
			break;
		}
	}
	if (dayHeaderRowIdx === -1) return false;

	// Check if first 3 columns have 2+ time values in rows below the day header
	for (let c = 0; c < Math.min(3, rawData[0]?.length ?? 0); c++) {
		let timeCount = 0;
		for (
			let r = dayHeaderRowIdx + 1;
			r < Math.min(dayHeaderRowIdx + 25, rawData.length);
			r++
		) {
			const cell = String(rawData[r]?.[c] ?? '').trim();
			if (isTimeCell(cell)) timeCount++;
		}
		if (timeCount >= 2) return true;
	}

	return false;
}

// / Parse a grid-format Excel timetable file.
// @ Detects the day-header row and time column, then maps each non-empty cell
// @ at a (day, time) intersection to a ParsedCourse.
export async function readGridScheduleExcel(file: File): Promise<GridExcelResult> {
	const buffer = await file.arrayBuffer();
	const workbook = XLSX.read(buffer, { type: 'array' });

	const sheetName = workbook.SheetNames[0];
	if (!sheetName) throw new Error('No sheets found in Excel file');

	const sheet = workbook.Sheets[sheetName];
	const rawData: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
		header: 1,
		defval: null,
		raw: false,
	});

	if (!isGridFormat(rawData)) {
		throw new Error('Excel file does not appear to be in grid format');
	}

	// --- Locate the day-header row and map column index → day name ---
	let dayHeaderRowIdx = -1;
	const dayColumnMap = new Map<number, string>(); // colIdx → full day name

	for (let r = 0; r < Math.min(10, rawData.length); r++) {
		const row = rawData[r] ?? [];
		const tempMap = new Map<number, string>();
		for (let c = 0; c < row.length; c++) {
			const dayName = resolveDayName(String(row[c] ?? '').trim());
			if (dayName) tempMap.set(c, dayName);
		}
		if (tempMap.size >= 3) {
			dayHeaderRowIdx = r;
			for (const [c, d] of tempMap) dayColumnMap.set(c, d);
			break;
		}
	}

	if (dayHeaderRowIdx === -1 || dayColumnMap.size === 0) {
		throw new Error('Could not locate day-header row in grid-format Excel');
	}

	// --- Locate the time column (first column with 2+ time values below the header) ---
	let timeColIdx = -1;
	const timeRowMap = new Map<number, string>(); // rowIdx → time string

	for (let c = 0; c < Math.min(3, rawData[0]?.length ?? 0); c++) {
		const tempMap = new Map<number, string>();
		for (
			let r = dayHeaderRowIdx + 1;
			r < rawData.length;
			r++
		) {
			const cell = String(rawData[r]?.[c] ?? '').trim();
			if (isTimeCell(cell)) tempMap.set(r, cell);
		}
		if (tempMap.size >= 2) {
			timeColIdx = c;
			for (const [r, t] of tempMap) timeRowMap.set(r, t);
			break;
		}
	}

	// --- Collect SheetJS merge information ---
	// Merged cells represent courses spanning multiple time rows or day columns.
	type CellRange = { sr: number; sc: number; er: number; ec: number };
	const merges: CellRange[] = (sheet['!merges'] ?? []).map(
		(m: { s: { r: number; c: number }; e: { r: number; c: number } }) => ({
			sr: m.s.r,
			sc: m.s.c,
			er: m.e.r,
			ec: m.e.c,
		})
	);

	// Helper: find the merge (if any) that covers (rowIdx, colIdx)
	function getMerge(rowIdx: number, colIdx: number): CellRange | undefined {
		return merges.find(
			(m) => rowIdx >= m.sr && rowIdx <= m.er && colIdx >= m.sc && colIdx <= m.ec
		);
	}

	// Helper: get the raw cell value, following merges to the top-left origin cell
	function getCellValue(rowIdx: number, colIdx: number): string {
		const merge = getMerge(rowIdx, colIdx);
		const originRow = merge ? merge.sr : rowIdx;
		const originCol = merge ? merge.sc : colIdx;
		return String(rawData[originRow]?.[originCol] ?? '').trim();
	}

	// --- Parse cell text into course fields ---
	function parseCellText(text: string): {
		title: string;
		courseCode: string;
		instructor: string;
	} {
		const lines = text
			.split(/[\n\r]+/)
			.map((l) => l.trim())
			.filter(Boolean);
		if (lines.length === 0) return { title: '', courseCode: '', instructor: '' };

		let title = lines[0];
		let courseCode = '';
		let instructor = '';

		for (let i = 1; i < lines.length; i++) {
			const line = lines[i];
			if (COURSE_CODE_RE.test(line)) {
				courseCode = line;
			} else if (
				/^[A-Za-z\s\-'.]+$/.test(line) &&
				line.split(/\s+/).length >= 2 &&
				line.split(/\s+/).length <= 5
			) {
				instructor = line;
			} else if (!title && line.length >= 3) {
				title = line;
			}
		}

		return { title, courseCode, instructor };
	}

	// --- Build time range from a time string and optional merge span ---
	function buildTimeRange(
		rowIdx: number,
		merge: CellRange | undefined
	): { startTime: string; endTime: string } {
		// If the cell spans multiple rows, find the first and last time rows it covers
		const coveredTimeRows = merge
			? Array.from(timeRowMap.keys()).filter((r) => r >= merge.sr && r <= merge.er)
			: timeRowMap.has(rowIdx)
				? [rowIdx]
				: [];

		if (coveredTimeRows.length === 0) {
			const direct = timeRowMap.get(rowIdx) ?? '';
			return { startTime: parseStartTime(direct), endTime: parseEndTime(direct) };
		}

		const firstRow = coveredTimeRows[0];
		const lastRow = coveredTimeRows[coveredTimeRows.length - 1];
		const firstTime = timeRowMap.get(firstRow) ?? '';
		const lastTime = timeRowMap.get(lastRow) ?? '';

		const startTime = parseStartTime(firstTime);
		// End time: use explicit end from last time string, or derive from start + 1 hour
		let endTime = parseEndTime(lastTime);
		if (!endTime) endTime = parseEndTime(firstTime);
		if (!endTime) endTime = addMinutes(startTime, 60);

		return { startTime, endTime };
	}

	// --- Main extraction loop ---
	const courseMap = new Map<string, ParsedCourse>();
	let blockIndex = 0;
	const visitedCells = new Set<string>(); // prevent re-processing merged cells

	const dayColumns = Array.from(dayColumnMap.keys()).sort((a, b) => a - b);
	const timeRows = Array.from(timeRowMap.keys()).sort((a, b) => a - b);

	for (const colIdx of dayColumns) {
		const day = dayColumnMap.get(colIdx)!;

		for (const rowIdx of timeRows) {
			const cellKey = `${rowIdx}-${colIdx}`;

			// Skip non-origin cells of a merge
			const merge = getMerge(rowIdx, colIdx);
			if (merge && (rowIdx !== merge.sr || colIdx !== merge.sc)) continue;

			// Skip already visited
			if (visitedCells.has(cellKey)) continue;
			visitedCells.add(cellKey);

			const cellValue = getCellValue(rowIdx, colIdx);
			if (!cellValue) continue;

			const { title, courseCode, instructor } = parseCellText(cellValue);
			if (!title && !courseCode) continue;

			// Skip cells that are just day names or time values (header-area spillover)
			if (isDayName(title) || isTimeCell(title)) continue;

			const displayTitle = title || courseCode;
			const { startTime, endTime } = buildTimeRange(rowIdx, merge);
			if (!startTime) continue;

			const slot: MeetingSlot = {
				day,
				dayCode: day.slice(0, 3),
				startTime,
				endTime: endTime || addMinutes(startTime, 60),
				room: '',
			};

			// Group courses that appear on multiple days (same title + code)
			const courseKey = courseCode || displayTitle;
			if (courseMap.has(courseKey)) {
				const existing = courseMap.get(courseKey)!;
				const isDupSlot = existing.meetingSlots.some(
					(s) => s.day === slot.day && s.startTime === slot.startTime
				);
				if (!isDupSlot) existing.meetingSlots.push(slot);
			} else {
				courseMap.set(courseKey, {
					id: `grid-course-${blockIndex++}`,
					courseCode,
					courseTitle: displayTitle,
					instructor,
					credits: '',
					campus: '',
					meetingSlots: [slot],
					confidence: courseCode ? 'high' : 'medium',
					reasons: ['Parsed from grid-format Excel timetable'],
					sourceRows: [rowIdx, rowIdx, rowIdx],
					rawTimeRoom: `${day} ${startTime}-${endTime}`,
				});
			}
		}
	}

	const courses = Array.from(courseMap.values());

	return {
		courses,
		sheetName,
		metadata: {
			fileName: file.name,
			fileSize: file.size,
			extractedAt: new Date(),
			totalDataRows: rawData.length - (dayHeaderRowIdx + 1),
			detectedCourses: courses.length,
		},
	};
}

// / Extract start time from a time string ("9:00" or "9:00-10:30")
function parseStartTime(s: string): string {
	const m = s.match(/(\d{1,2}:\d{2})/);
	return m ? normalizeTime(m[1]) : '';
}

// / Extract end time from a range string ("9:00-10:30"), returns '' for bare start times
function parseEndTime(s: string): string {
	const m = s.match(/[-–]\s*(\d{1,2}:\d{2})/);
	return m ? normalizeTime(m[1]) : '';
}

// / Pad hours to two digits: "9:00" → "09:00"
function normalizeTime(t: string): string {
	const [h, min] = t.split(':');
	return `${String(Number(h)).padStart(2, '0')}:${min}`;
}

// / Add minutes to a "HH:MM" time string
function addMinutes(time: string, minutes: number): string {
	const [h, m] = time.split(':').map(Number);
	const total = h * 60 + m + minutes;
	return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
