// @ Main schedule scanner orchestrator
// # Purpose: Coordinate SKKU schedule scanners to extract courses from Excel and PDF files
// # Borrows pipeline pattern from syllabusScannerMain.ts

import * as XLSX from 'xlsx';
import { readScheduleExcel, type ScheduleExcelData } from './scheduleExcelReader';
import {
	parseScheduleBlocks,
	buildScheduleSummary,
	type ParsedCourse,
	type ScheduleSummary,
} from './scheduleParser';
import { parsePdfTimetable } from './pdfGridParser';
import { isGridFormat, readGridScheduleExcel } from './scheduleExcelGridReader';

// / Result from scanning a schedule file
// @ Borrows structure from syllabusScannerMain.ts ScannerResult
export interface ScheduleScanResult {
	courses: ParsedCourse[];
	summary: ScheduleSummary;
	processedFile: {
		name: string;
		sheetName: string;
		extractedRows: number;
		detectedBlocks: number;
	};
}

// / Detect if file is a PDF
function isPdfFile(file: File): boolean {
	return (
		file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
	);
}

// / Main scanner function — orchestrates the schedule scanning pipeline
// @ Borrows the step-by-step approach from syllabusScannerMain.ts scanSyllabus()
export async function scanSchedule(file: File): Promise<ScheduleScanResult> {
	try {
		// Check if PDF or Excel
		if (isPdfFile(file)) {
			return await scanPdfSchedule(file);
		} else {
			return await scanExcelSchedule(file);
		}
	} catch (error) {
		console.error('Error scanning schedule:', error);
		throw new Error(
			`Failed to scan schedule: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

// / Scan Excel file — detects grid format vs 3-row-block format automatically
async function scanExcelSchedule(file: File): Promise<ScheduleScanResult> {
	// Quick format detection: read raw data once to check structure
	const buffer = await file.arrayBuffer();
	const wb = XLSX.read(buffer, { type: 'array' });
	const firstSheet = wb.SheetNames[0] ?? '';
	const rawData: (string | number | null)[][] = XLSX.utils.sheet_to_json(
		wb.Sheets[firstSheet] ?? {},
		{ header: 1, defval: null, raw: false }
	);

	if (isGridFormat(rawData)) {
		// --- Grid format (days as columns, times as rows) ---
		const gridResult = await readGridScheduleExcel(file);
		const summary = buildScheduleSummary(gridResult.courses);

		return {
			courses: gridResult.courses,
			summary,
			processedFile: {
				name: file.name,
				sheetName: gridResult.sheetName,
				extractedRows: gridResult.metadata.totalDataRows,
				detectedBlocks: gridResult.metadata.detectedCourses,
			},
		};
	}

	// --- Standard 3-row-block format ---

	// # Step 1: Read Excel file into structured course blocks
	const excelData: ScheduleExcelData = await readScheduleExcel(file);

	// @ Step 2: Parse course blocks into structured courses
	const { courses, summary } = parseScheduleBlocks(excelData);

	// / Compile results
	return {
		courses,
		summary,
		processedFile: {
			name: file.name,
			sheetName: excelData.sheetName,
			extractedRows: excelData.metadata.totalDataRows,
			detectedBlocks: excelData.metadata.detectedCourses,
		},
	};
}

// / Scan PDF file (grid timetable format)
async function scanPdfSchedule(file: File): Promise<ScheduleScanResult> {
	const pdfResult = await parsePdfTimetable(file);
	const summary = buildScheduleSummary(pdfResult.courses);

	return {
		courses: pdfResult.courses,
		summary,
		processedFile: {
			name: file.name,
			sheetName: 'PDF Timetable',
			extractedRows: pdfResult.metadata.pageCount,
			detectedBlocks: pdfResult.metadata.sectionsFound,
		},
	};
}

// / Validate scan results before presenting to user
// @ Borrows from syllabusScannerMain.ts validateScannerResults()
export function validateScheduleResults(result: ScheduleScanResult): {
	isValid: boolean;
	warnings: string[];
	recommendations: string[];
} {
	const warnings: string[] = [];
	const recommendations: string[] = [];

	// # Check if any courses were found
	if (result.courses.length === 0) {
		warnings.push('No courses found in the uploaded file.');
		recommendations.push('Verify the file is an SKKU course schedule export');
		recommendations.push('Check that the file has the standard 3-row-per-course format');
	}

	// @ Check expected course count range (3-7 typical)
	if (result.courses.length > 0 && result.courses.length < 3) {
		recommendations.push(
			`Only ${result.courses.length} course(s) detected — verify nothing was missed`
		);
	}
	if (result.courses.length > 7) {
		recommendations.push(
			`${result.courses.length} courses detected — verify no duplicates`
		);
	}

	// / Check for courses missing meeting slots
	const noSlots = result.courses.filter((c) => c.meetingSlots.length === 0);
	if (noSlots.length > 0) {
		warnings.push(
			`${noSlots.length} course(s) have no meeting time/room — review needed`
		);
		recommendations.push('Check that the Class Time/Classroom field is populated for all courses');
	}

	// # Check confidence levels
	if (result.summary.lowConfidence > result.summary.highConfidence) {
		warnings.push('Most courses have low confidence — some fields may be missing');
		recommendations.push('Review each course entry carefully');
	}

	return {
		isValid: result.courses.length > 0,
		warnings,
		recommendations,
	};
}
