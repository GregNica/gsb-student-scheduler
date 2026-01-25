// @ Main syllabus scanner orchestrator
// # Purpose: Coordinate all scanners to extract assignments from documents

import type { CourseData } from './courseStorage';
import type { ScannedAssignment } from './assignmentAggregator';
import { readDocumentFile, type ExtractedDocument } from './fileReader';
import { findDates } from './dateFinder';
import { buildKeywordList, findKeywords } from './keywordMatcher';
import { analyzeContext } from './contextAnalyzer';
import { aggregateAssignments, getAssignmentSummary } from './assignmentAggregator';

// / Define scanner result structure
export interface ScannerResult {
	assignments: ScannedAssignment[];
	summary: {
		total: number;
		highConfidence: number;
		mediumConfidence: number;
		lowConfidence: number;
		requiresReview: number;
		byType: Record<string, number>;
	};
	processedFile: {
		name: string;
		type: 'pdf' | 'csv' | 'excel';
		extractedLines: number;
	};
	scanDetails: {
		datesFound: number;
		keywordsFound: number;
		matchesAnalyzed: number;
	};
}

// / Main scanner function - orchestrates the entire scanning process
export async function scanSyllabus(
	file: File,
	courseData: CourseData
): Promise<ScannerResult> {
	try {
		// # Step 1: Read and extract document
		const document = await readDocumentFile(file);
		console.log('📄 Document read. File type:', document.fileType, 'Lines:', document.lines.length);
		console.log('📝 First 5 lines:', document.lines.slice(0, 5));

		// @ Step 2: Find all dates in document
		const dates = findDates(document.lines, courseData);
		console.log('📅 Dates found:', dates.length, dates.slice(0, 5));

		// / Step 3: Build keyword list from course data
		const keywordMap = buildKeywordList(courseData);
		// # keywordMap is a Map, so use .size not Object.keys().length
		console.log('🔑 Keywords to search:', keywordMap.size, 'keywords');

		// # Step 4: Find all keywords in document
		const keywords = findKeywords(document.lines, keywordMap);
		console.log('🔍 Keywords found:', keywords.length, keywords.slice(0, 5));

		// @ Step 5: Analyze context and match keywords to dates
		const matches = analyzeContext(keywords, dates, document.lines, courseData);
		console.log('🎯 Matches found:', matches.length);

		// / Step 6: Aggregate matches into assignments
		const assignments = aggregateAssignments(matches, document.lines);
		console.log('✅ Assignments created:', assignments.length);

		// # Get summary statistics
		const summary = getAssignmentSummary(assignments);

		// @ Compile results
		const result: ScannerResult = {
			assignments,
			summary,
			processedFile: {
				name: file.name,
				type: document.fileType,
				extractedLines: document.lines.length,
			},
			scanDetails: {
				datesFound: dates.length,
				keywordsFound: keywords.length,
				matchesAnalyzed: matches.length,
			},
		};

		return result;
	} catch (error) {
		console.error('Error scanning syllabus:', error);
		throw new Error(`Failed to scan syllabus: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

// / Validate scanner results before presenting to user
export function validateScannerResults(result: ScannerResult): {
	isValid: boolean;
	warnings: string[];
	recommendations: string[];
} {
	const warnings: string[] = [];
	const recommendations: string[] = [];

	// # Check if any assignments were found
	if (result.assignments.length === 0) {
		warnings.push('No assignments found in document. Check that keywords are correct.');
		recommendations.push('Verify course setup keywords match your syllabus');
		recommendations.push('Try uploading a different file format');
	}

	// @ Check confidence levels
	if (result.summary.lowConfidence > result.summary.highConfidence) {
		warnings.push('Most found assignments have low confidence');
		recommendations.push('Review each assignment carefully before adding to calendar');
		recommendations.push('Check if custom keywords are too broad or too narrow');
	}

	// / Check for items requiring review
	if (result.summary.requiresReview > result.summary.total * 0.5) {
		warnings.push(`${result.summary.requiresReview} of ${result.summary.total} assignments need review`);
		recommendations.push('Manually verify ambiguous week/session references');
	}

	// # Check dates found
	if (result.scanDetails.datesFound === 0) {
		warnings.push('No dates found in document');
		recommendations.push('Check semester dates are correct');
		recommendations.push('Verify document contains formatted dates');
	}

	// @ Check keywords found
	if (result.scanDetails.keywordsFound === 0) {
		warnings.push('No assignment keywords found');
		recommendations.push('Verify keywords match your syllabus');
		recommendations.push('Try adding custom keywords');
	}

	return {
		isValid: result.assignments.length > 0,
		warnings,
		recommendations,
	};
}

// / Format assignment for calendar
export function formatAssignmentForCalendar(assignment: ScannedAssignment): {
	title: string;
	date: string;
	description: string;
} {
	return {
		title: assignment.name,
		date: assignment.dueDate,
		description: `${assignment.type.toUpperCase()}: ${assignment.description}`,
	};
}
