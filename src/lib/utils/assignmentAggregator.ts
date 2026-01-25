// @ Assignment aggregator utility
// # Purpose: Combine matches into clean assignment objects

import type { KeywordDateMatch } from './contextAnalyzer';
import type { FoundKeyword } from './keywordMatcher';
import { extractAssignmentName } from './keywordMatcher';
import { formatDate } from './dateFinder';
import { classifyAssignment, type AssignmentClassification } from './assignmentTypeClassifier';

// / Define final assignment structure
export interface ScannedAssignment {
	id: string; // Unique ID for this assignment
	name: string; // Assignment name/title
	type: string; // quiz, assignment, project, etc.
	dueDate: string; // ISO date string (YYYY-MM-DD)
	dueDateFormatted: string; // Readable format (e.g., "Jan 15, 2025")
	description: string; // Context/description from syllabus
	confidence: 'high' | 'medium' | 'low';
	confidenceColor: string;
	sourceLineNumbers: number[]; // Where this was found in document
	requiresReview: boolean; // Flag for user review
	reasons: string[]; // Why we matched this
	// @ Assignment scope and requirement classification
	scope?: 'in-class' | 'take-home' | 'before-class' | 'unknown';
	isRequired?: boolean;
	classification?: AssignmentClassification;
}

// / Clean and standardize assignment name
// # Removes punctuation, dates, duplicate words, and formats properly
function cleanAssignmentName(rawName: string, keyword: string, dateString: string): string {
	let name = rawName;

	// @ Step 1: Remove date strings that got captured in the name
	// / Handles ISO format (2026-02-05), slash format (02/05/26), and month names
	const datePatterns = [
		/\d{4}-\d{2}-\d{2}/g, // ISO: 2026-02-05
		/\d{1,2}\/\d{1,2}\/\d{2,4}/g, // Slash: 02/05/26
		/\d{1,2}-\d{1,2}-\d{2,4}/g, // Dash: 02-05-26
		/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?\b/gi, // Month Day
	];
	datePatterns.forEach((pattern) => {
		name = name.replace(pattern, '');
	});

	// # Step 2: Remove the specific date string if it appears
	if (dateString) {
		name = name.replace(new RegExp(dateString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
	}

	// @ Step 3: Remove duplicate keyword (e.g., "quiz Quiz 1" → "Quiz 1")
	// / This happens when both the type column and assignment column have the keyword
	const keywordLower = keyword.toLowerCase();
	const keywordRegex = new RegExp(`\\b${keywordLower}\\b`, 'gi');
	const matches = name.match(keywordRegex);
	if (matches && matches.length > 1) {
		// # Remove all but one occurrence, keeping the one with proper capitalization
		let found = false;
		name = name.replace(keywordRegex, (match) => {
			if (!found) {
				found = true;
				return match.charAt(0).toUpperCase() + match.slice(1).toLowerCase();
			}
			return '';
		});
	}

	// / Step 4: Remove leading/trailing punctuation and whitespace
	// @ Includes commas, quotes, colons, semicolons, dashes, periods
	name = name
		.replace(/^[\s,;:\-–—.'""`]+/, '') // Leading punctuation (including quotes)
		.replace(/[\s,;:\-–—.'""`]+$/, '') // Trailing punctuation (including quotes)
		.replace(/\s+/g, ' ') // Multiple spaces to single
		.trim();

	// # Step 5: Remove common noise words at the start
	const noiseStarts = /^(due|submit|complete|finish|turn in|hand in)[:\s-]*/i;
	name = name.replace(noiseStarts, '').trim();

	// @ Step 6: Ensure proper capitalization (Title Case for first word)
	if (name.length > 0) {
		name = name.charAt(0).toUpperCase() + name.slice(1);
	}

	// / Step 7: Final cleanup - catch any remaining punctuation artifacts
	// # This runs after all other transformations to catch edge cases
	name = name
		.replace(/^[\s,;:\-–—.'""`()\[\]]+/, '') // Leading junk (second pass)
		.replace(/[\s,;:\-–—.'""`()\[\]]+$/, '') // Trailing junk (second pass)
		.trim();

	// # Step 8: If name is empty or just whitespace, use capitalized keyword
	if (!name || name.trim().length === 0) {
		return keyword.charAt(0).toUpperCase() + keyword.slice(1).toLowerCase();
	}

	return name;
}

// / Clean and format description into readable sentences
// # Extracts meaningful context and formats it nicely, or returns default message
function cleanDescription(
	rawContext: string,
	cleanedName: string,
	dateString: string,
	keyword: string
): string {
	let desc = rawContext;

	// @ Step 1: Remove the assignment name from context (it's already in the name field)
	if (cleanedName) {
		desc = desc.replace(new RegExp(cleanedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
	}

	// # Step 2: Remove date strings
	const datePatterns = [
		/\d{4}-\d{2}-\d{2}/g,
		/\d{1,2}\/\d{1,2}\/\d{2,4}/g,
		/\d{1,2}-\d{1,2}-\d{2,4}/g,
		/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,?\s*\d{4})?\b/gi,
	];
	datePatterns.forEach((pattern) => {
		desc = desc.replace(pattern, '');
	});
	if (dateString) {
		desc = desc.replace(new RegExp(dateString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
	}

	// / Step 3: Remove standalone keyword if it appears alone (likely from type column)
	const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
	desc = desc.replace(keywordRegex, '');

	// @ Step 4: Clean up punctuation and spacing
	desc = desc
		.replace(/^[\s,;:\-–—|>'""`()\[\]]+/, '') // Leading junk
		.replace(/[\s,;:\-–—|>'""`()\[\]]+$/, '') // Trailing junk
		.replace(/[,;:\-–—|>]{2,}/g, ' ') // Multiple separators to space
		.replace(/\s+/g, ' ') // Multiple spaces to single
		.trim();

	// / Step 5: Final cleanup pass
	desc = desc
		.replace(/^[\s,;:\-–—.'""`()\[\]]+/, '')
		.replace(/[\s,;:\-–—.'""`()\[\]]+$/, '')
		.trim();

	// # Step 6: Check if we have meaningful content
	if (!desc || desc.length < 3 || desc.toLowerCase() === keyword.toLowerCase()) {
		// @ No meaningful description found - return default message
		return 'No additional details found in syllabus.';
	}

	// / Step 7: Format into a readable sentence
	return formatDescriptionSentence(desc);
}

// / Format raw context into a readable sentence structure
// # Uses templates based on what information is available
function formatDescriptionSentence(rawDesc: string): string {
	const desc = rawDesc.trim();

	// @ Check for common patterns and format accordingly

	// # Pattern 1: Contains action words (submit, complete, read, etc.)
	const actionWords = /\b(submit|complete|read|review|prepare|study|write|finish|upload|turn in|hand in)\b/i;
	if (actionWords.test(desc)) {
		// Already has an action word - capitalize first letter and ensure period
		let formatted = desc.charAt(0).toUpperCase() + desc.slice(1);
		if (!formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
			formatted += '.';
		}
		return formatted;
	}

	// @ Pattern 2: Contains "chapter", "page", "section" - likely reading/material reference
	const materialWords = /\b(chapter|ch\.|page|pg\.|section|pages|chapters)\b/i;
	if (materialWords.test(desc)) {
		let formatted = 'Covers ' + desc.charAt(0).toLowerCase() + desc.slice(1);
		if (!formatted.endsWith('.')) {
			formatted += '.';
		}
		return formatted;
	}

	// / Pattern 3: Contains percentage or points - likely grading info
	const gradingWords = /\b(\d+\s*%|\d+\s*points?|\d+\s*pts?)\b/i;
	if (gradingWords.test(desc)) {
		let formatted = 'Worth ' + desc.charAt(0).toLowerCase() + desc.slice(1);
		if (!formatted.endsWith('.')) {
			formatted += '.';
		}
		return formatted;
	}

	// # Pattern 4: Short description (under 50 chars) - wrap in context
	if (desc.length < 50) {
		// Capitalize and add period
		let formatted = desc.charAt(0).toUpperCase() + desc.slice(1);
		if (!formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
			formatted += '.';
		}
		return formatted;
	}

	// @ Pattern 5: Longer description - just clean and format
	let formatted = desc.charAt(0).toUpperCase() + desc.slice(1);
	if (!formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
		formatted += '.';
	}

	// / Truncate if too long (max 200 chars)
	if (formatted.length > 200) {
		formatted = formatted.substring(0, 197) + '...';
	}

	return formatted;
}

// / Aggregate keyword-date matches into assignments
export function aggregateAssignments(
	matches: KeywordDateMatch[],
	lines: string[]
): ScannedAssignment[] {
	const assignments: ScannedAssignment[] = [];
	const seenPairs = new Set<string>();

	// # Sort matches by confidence (high first) then by line number
	const sortedMatches = [...matches].sort((a, b) => {
		const confidenceOrder = { high: 0, medium: 1, low: 2 };
		const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
		if (confDiff !== 0) return confDiff;
		return Math.min(a.keyword.lineNumber, a.date.lineNumber) -
			Math.min(b.keyword.lineNumber, b.date.lineNumber);
	});

	// @ Process each match
	sortedMatches.forEach((match) => {
		// / Prevent duplicate assignments
		const pairKey = `${match.keyword.keyword}-${match.date.dateString}`;
		if (seenPairs.has(pairKey)) {
			return;
		}
		seenPairs.add(pairKey);

		// # Extract assignment name from context
		const rawName = extractAssignmentName(match.keyword, lines);

		// @ Clean and standardize the name
		// / Removes dates, duplicate keywords, punctuation, and formats properly
		const assignmentName = cleanAssignmentName(
			rawName,
			match.keyword.keyword,
			match.date.dateString
		);

		// # Get raw description from context
		const rawDescription = buildDescription(match, lines);

		// @ Clean and format the description
		// / Removes name and date from context, keeps useful info
		const description = cleanDescription(
			rawDescription,
			assignmentName,
			match.date.dateString,
			match.keyword.keyword
		);

		// / Classify assignment scope and requirement level
		const nearbyLines = getNearbyLines(match.keyword.lineNumber, lines, 3);
		const classification = classifyAssignment(assignmentName, match.keyword.context, nearbyLines);

		// / Create assignment object
		const assignment: ScannedAssignment = {
			id: generateAssignmentId(assignmentName, match.date.date!),
			name: assignmentName,
			type: match.keyword.type,
			dueDate: match.date.date ? formatISODate(match.date.date) : '',
			dueDateFormatted: match.date.date ? formatDate(match.date.date) : 'Unknown',
			description,
			confidence: match.confidence,
			confidenceColor: getConfidenceColor(match.confidence),
			sourceLineNumbers: [match.keyword.lineNumber, match.date.lineNumber],
			requiresReview: match.confidence !== 'high' || (match.date.requiresReview ?? false),
			reasons: match.reasoning,
			scope: classification.scope,
			isRequired: classification.requirement === 'required',
			classification,
		};

		assignments.push(assignment);
	});

	// # Remove duplicate assignments (same name and date)
	return deduplicateAssignments(assignments);
}

// / Detect if a line is tabular (has column structure)
// # Tabular lines have multiple comma-separated or pipe-separated values
function isTabularLine(line: string): boolean {
	if (!line) return false;

	// @ Count delimiters
	const commaCount = (line.match(/,/g) || []).length;
	const pipeCount = (line.match(/\|/g) || []).length;
	const tabCount = (line.match(/\t/g) || []).length;

	// # If line has 2+ commas, tabs, or pipes, it's likely tabular
	// / Excel/CSV files typically have at least 2 columns (date, assignment) = 1 comma
	// / With a description column = 2 commas
	return commaCount >= 2 || pipeCount >= 2 || tabCount >= 1;
}

// / Extract description from a tabular row by parsing columns
// # For Excel/CSV rows like: "2026-01-28,Quiz 1,This is the description"
function extractDescriptionFromRow(
	row: string,
	keyword: string,
	dateString: string
): string {
	// @ Detect delimiter (comma, pipe, or tab)
	let delimiter = ',';
	if ((row.match(/\|/g) || []).length >= 2) delimiter = '|';
	if ((row.match(/\t/g) || []).length >= 1) delimiter = '\t';

	// # Split into columns
	const columns = row.split(delimiter).map((col) => col.trim());

	// @ Find which column has the description
	// / Strategy: The description is usually the LAST column that isn't a date or the keyword
	// / Skip columns that look like dates or contain the main keyword with a number

	const datePattern = /^\d{4}-\d{2}-\d{2}$|^\d{1,2}\/\d{1,2}\/\d{2,4}$/;
	const keywordLower = keyword.toLowerCase();

	// # Find columns that are likely descriptions (not dates, not the assignment name)
	const descriptionCandidates: string[] = [];

	columns.forEach((col, index) => {
		const colLower = col.toLowerCase();

		// / Skip if it's a date
		if (datePattern.test(col)) return;

		// / Skip if it matches the date string
		if (col === dateString) return;

		// / Skip if it's just the keyword alone (type column)
		if (colLower === keywordLower) return;

		// / Skip if it's the assignment name (keyword + number)
		const keywordWithNumber = new RegExp(`^${keywordLower}\\s*\\d+$`, 'i');
		if (keywordWithNumber.test(col)) return;

		// / Skip short columns that are likely type indicators
		if (col.length < 5 && index < columns.length - 1) return;

		// @ This column is likely description content
		if (col.length > 0) {
			descriptionCandidates.push(col);
		}
	});

	// # Return the best description candidate
	// / Prefer longer content (more likely to be actual description)
	if (descriptionCandidates.length > 0) {
		// Sort by length descending, return the longest
		descriptionCandidates.sort((a, b) => b.length - a.length);
		return descriptionCandidates[0];
	}

	// @ Fallback: return empty (will trigger "No additional details" message)
	return '';
}

// / Build description from surrounding context
function buildDescription(match: KeywordDateMatch, lines: string[]): string {
	const keywordLine = lines[match.keyword.lineNumber];
	const dateLine = lines[match.date.lineNumber];

	// @ Step 1: Check if this is tabular data (has column separators)
	// / Tabular data has commas, tabs, or pipes separating columns
	const isTabular = isTabularLine(keywordLine);

	if (isTabular) {
		// # For tabular data: ONLY use content from the SAME ROW
		// / Don't pull from adjacent lines - they're different assignments!
		return extractDescriptionFromRow(keywordLine, match.keyword.keyword, match.date.dateString);
	}

	// @ For non-tabular data: use proximity-based approach
	const parts: string[] = [];

	// # Start with the keyword line
	if (keywordLine) {
		parts.push(keywordLine.trim());
	}

	// / Add date line if different
	if (dateLine && dateLine !== keywordLine) {
		parts.push(dateLine.trim());
	}

	// @ Only look at nearby lines if NOT tabular
	// / For documents like PDFs where description might be on next line
	if (lines[match.keyword.lineNumber + 1]) {
		const afterLine = lines[match.keyword.lineNumber + 1].trim();
		// # Only add if it looks like a continuation (not a new assignment)
		// / Skip if it contains a date (likely a new row)
		const hasDate = /\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}/.test(afterLine);
		const hasNewKeyword = /\b(quiz|assignment|homework|project|exam|test|essay)\s*\d/i.test(afterLine);

		if (afterLine.length > 0 && afterLine.length < 150 && !hasDate && !hasNewKeyword) {
			parts.push(afterLine);
		}
	}

	// / Join and clean description
	return parts
		.filter((p, idx, arr) => arr.indexOf(p) === idx) // Remove duplicates
		.join(' > ')
		.substring(0, 500); // Limit length
}

// / Remove duplicate assignments
function deduplicateAssignments(assignments: ScannedAssignment[]): ScannedAssignment[] {
	const seen = new Map<string, ScannedAssignment>();

	assignments.forEach((assignment) => {
		const key = `${assignment.name.toLowerCase()}-${assignment.dueDate}`;

		// # Keep the higher confidence version
		if (!seen.has(key) || seen.get(key)!.confidence !== 'high') {
			seen.set(key, assignment);
		}
	});

	return Array.from(seen.values());
}

// / Generate unique ID for assignment
function generateAssignmentId(name: string, date: Date): string {
	const nameHash = name
		.toLowerCase()
		.replace(/\s+/g, '-')
		.substring(0, 20);
	const dateStr = date.toISOString().substring(0, 10);
	return `${nameHash}-${dateStr}`;
}

// / Format Date object to ISO string
function formatISODate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

// / Get confidence color for display
function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
	switch (confidence) {
		case 'high':
			return 'green';
		case 'medium':
			return 'yellow';
		case 'low':
			return 'red';
	}
}

// / Get nearby lines from document for context analysis
function getNearbyLines(lineNumber: number, lines: string[], range: number): string[] {
	const start = Math.max(0, lineNumber - range);
	const end = Math.min(lines.length, lineNumber + range + 1);
	return lines.slice(start, end);
}

// / Get summary statistics about found assignments
export function getAssignmentSummary(assignments: ScannedAssignment[]): {
	total: number;
	highConfidence: number;
	mediumConfidence: number;
	lowConfidence: number;
	requiresReview: number;
	byType: Record<string, number>;
} {
	const summary = {
		total: assignments.length,
		highConfidence: 0,
		mediumConfidence: 0,
		lowConfidence: 0,
		requiresReview: 0,
		byType: {} as Record<string, number>,
	};

	assignments.forEach((assignment) => {
		// @ Count by confidence
		if (assignment.confidence === 'high') summary.highConfidence++;
		if (assignment.confidence === 'medium') summary.mediumConfidence++;
		if (assignment.confidence === 'low') summary.lowConfidence++;

		// / Count requiring review
		if (assignment.requiresReview) summary.requiresReview++;

		// # Count by type
		summary.byType[assignment.type] = (summary.byType[assignment.type] || 0) + 1;
	});

	return summary;
}
