// @ Main schedule scanner orchestrator
// # Purpose: Coordinate SKKU schedule scanners to extract courses from Excel files
// # Borrows pipeline pattern from syllabusScannerMain.ts

import { readScheduleExcel, type ScheduleExcelData } from './scheduleExcelReader';
import {
	parseScheduleBlocks,
	type ParsedCourse,
	type ScheduleSummary,
} from './scheduleParser';

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

// / Main scanner function — orchestrates the schedule scanning pipeline
// @ Borrows the step-by-step approach from syllabusScannerMain.ts scanSyllabus()
export async function scanSchedule(file: File): Promise<ScheduleScanResult> {
	try {
		// # Step 1: Read Excel file into structured course blocks
		console.log('📋 Step 1: Reading Excel file...');
		const excelData: ScheduleExcelData = await readScheduleExcel(file);
		console.log(
			`✅ File read: ${excelData.metadata.totalDataRows} data rows, ${excelData.metadata.detectedCourses} course blocks`
		);
		console.log('📋 Header row 1:', excelData.headerLabels.row1);

		// @ Step 2: Parse course blocks into structured courses
		console.log('📋 Step 2: Parsing course blocks...');
		const { courses, summary } = parseScheduleBlocks(excelData);
		console.log(`✅ Parsed ${courses.length} courses`);

		for (const course of courses) {
			console.log(
				`  📌 ${course.courseCode} — ${course.courseTitle} — ${course.meetingSlots.length} slot(s) — ${course.confidence}`
			);
			for (const slot of course.meetingSlots) {
				console.log(
					`     ${slot.day} ${slot.startTime}-${slot.endTime} [${slot.room}]`
				);
			}
		}

		// / Compile results
		const result: ScheduleScanResult = {
			courses,
			summary,
			processedFile: {
				name: file.name,
				sheetName: excelData.sheetName,
				extractedRows: excelData.metadata.totalDataRows,
				detectedBlocks: excelData.metadata.detectedCourses,
			},
		};

		return result;
	} catch (error) {
		console.error('Error scanning schedule:', error);
		throw new Error(
			`Failed to scan schedule: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
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
