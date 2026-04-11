// @ Schedule Excel reader utility
// # Purpose: Read SKKU-format Excel schedule files (3 header rows + 3 rows per course)
// # Borrows Excel parsing from fileReader.ts but returns structured course blocks
// NOTE: Excel reading is not used in the admin app. This file provides type exports
// that scheduleParser.ts depends on. Excel readers are archived in archive/.

import * as XLSX from 'xlsx';

// / A single cell value (string, number, or empty)
export type CellValue = string | number | null;

// / Raw course block: the 3 rows that make up one course entry
export interface RawCourseBlock {
	blockIndex: number; // 0-based course number
	// Row 1 of 3: primary info
	courseCode: string; // Column B, row 1
	courseTitle: string; // Column C, row 1
	credits: string; // Column E, row 1
	hours: string; // Column F, row 1
	instructor: string; // Column G, row 1
	majorType: string; // Column H, row 1
	// Row 2 of 3: schedule + campus info
	campus: string; // Column B, row 2
	classTimeRoom: string; // Column C, row 2 — e.g. "Tue17:10-18:50【9B113】"
	classType: string; // Column E, row 2
	courseType: string; // Column H, row 2
	module: string; // Column I, row 2
	// Row 3 of 3: status + remarks
	confirmed: string; // Column B, row 3 — e.g. "확정"
	remarks: string; // Column C, row 3
	classInfo: string; // Column G, row 3
	// Source row indices for debugging
	sourceRows: [number, number, number];
}

// / Structured result from reading an SKKU schedule Excel file
export interface ScheduleExcelData {
	courseBlocks: RawCourseBlock[];
	headerLabels: {
		row1: string[]; // Header row 1 labels
		row2: string[]; // Header row 2 labels
		row3: string[]; // Header row 3 labels
	};
	sheetName: string;
	metadata: {
		fileName: string;
		fileSize: number;
		extractedAt: Date;
		totalDataRows: number;
		detectedCourses: number;
	};
}

// / Read an SKKU-format Excel schedule file
// @ Format: 3 header rows, then groups of 3 rows per course
// # Columns: A=No., B=Course Code, C=Course Title, D=Type of Courses,
// #   E=Credits, F=Hours, G=Instructor, H=Type of Major, I=Course Cancellation
// # Row 2 of each block: B=Campus, C=Class Time/Classroom, E=Type of Class, etc.
// # Row 3 of each block: B=확정여부, C=Remarks, G=Class Info
export async function readScheduleExcel(file: File): Promise<ScheduleExcelData> {
	try {
		// # Read file as ArrayBuffer
		const buffer = await file.arrayBuffer();

		// @ Parse workbook
		const workbook = XLSX.read(buffer, { type: 'array' });

		// # Get first sheet
		const sheetName = workbook.SheetNames[0];
		if (!sheetName) {
			throw new Error('No sheets found in Excel file');
		}

		const sheet = workbook.Sheets[sheetName];

		// @ Convert sheet to array of arrays (preserves column structure)
		const rawData: (string | number | null)[][] = XLSX.utils.sheet_to_json(sheet, {
			header: 1,
			defval: null,
			raw: false, // Return formatted strings
		});

		if (rawData.length < 6) {
			// Need at least 3 header rows + 3 rows for 1 course
			throw new Error('File does not contain enough rows for a valid schedule');
		}

		// # Extract header labels (first 3 rows)
		const headerLabels = {
			row1: rawData[0].map((c) => cellToString(c)),
			row2: rawData[1].map((c) => cellToString(c)),
			row3: rawData[2].map((c) => cellToString(c)),
		};

		// @ Parse course blocks: every 3 rows starting from row index 3
		const courseBlocks: RawCourseBlock[] = [];
		const dataStartRow = 3;
		const totalDataRows = rawData.length - dataStartRow;

		let blockIndex = 0;
		for (let r = dataStartRow; r + 2 < rawData.length; r += 3) {
			const row1 = rawData[r]; // Primary info row
			const row2 = rawData[r + 1]; // Schedule/campus row
			const row3 = rawData[r + 2]; // Status/remarks row

			// # Skip blocks with no course code and no course title
			const courseCode = cellToString(row1[1]); // Column B
			const courseTitle = cellToString(row1[2]); // Column C
			if (!courseCode && !courseTitle) continue;

			const block: RawCourseBlock = {
				blockIndex,
				// Row 1 fields
				courseCode,
				courseTitle,
				credits: cellToString(row1[4]), // Column E
				hours: cellToString(row1[5]), // Column F
				instructor: cellToString(row1[6]), // Column G
				majorType: cellToString(row1[7]), // Column H
				// Row 2 fields
				campus: cellToString(row2[1]), // Column B
				classTimeRoom: cellToString(row2[2]), // Column C — the key field
				classType: cellToString(row2[4]), // Column E
				courseType: cellToString(row2[7]), // Column H
				module: cellToString(row2[8]), // Column I
				// Row 3 fields
				confirmed: cellToString(row3[1]), // Column B
				remarks: cellToString(row3[2]), // Column C
				classInfo: cellToString(row3[6]), // Column G
				// Source tracking
				sourceRows: [r, r + 1, r + 2],
			};

			courseBlocks.push(block);
			blockIndex++;
		}

		return {
			courseBlocks,
			headerLabels,
			sheetName,
			metadata: {
				fileName: file.name,
				fileSize: file.size,
				extractedAt: new Date(),
				totalDataRows,
				detectedCourses: courseBlocks.length,
			},
		};
	} catch (error) {
		if (error instanceof Error && (error.message.includes('Excel') || error.message.includes('schedule'))) {
			throw error;
		}
		throw new Error(
			`Failed to read Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
}

// / Convert a raw cell value to a trimmed string
function cellToString(cell: string | number | null | undefined): string {
	if (cell === null || cell === undefined) return '';
	return String(cell).trim();
}
