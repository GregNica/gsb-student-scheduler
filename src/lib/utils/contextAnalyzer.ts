// @ Context analyzer utility
// # Purpose: Match keywords with dates and score confidence

import type { FoundKeyword } from './keywordMatcher';
import type { FoundDate } from './dateFinder';
import type { CourseData } from './courseStorage';

// / Define keyword-date match
export interface KeywordDateMatch {
	keyword: FoundKeyword;
	date: FoundDate;
	distance: number; // Line distance between keyword and date
	confidence: 'high' | 'medium' | 'low';
	matchType: 'same-line' | 'stacked' | 'table-row' | 'nearby';
	reasoning: string[];
}

// / Analyze context around keywords and dates to find valid matches
export function analyzeContext(
	keywords: FoundKeyword[],
	dates: FoundDate[],
	lines: string[],
	courseData?: CourseData
): KeywordDateMatch[] {
	const matches: KeywordDateMatch[] = [];

	// # For each keyword, find nearby dates
	keywords.forEach((keyword) => {
		dates.forEach((date) => {
			const distance = Math.abs(keyword.lineNumber - date.lineNumber);
			const matching = isValidKeywordDateMatch(keyword, date, distance, lines, courseData);

			if (matching) {
				matches.push(matching);
			}
		});
	});

	// @ Deduplicate matches in two passes:
	// / Pass 1: One assignment per (keyword line, date) - handles "Quiz 1, quiz" duplication
	// / Pass 2: One assignment per date, preferring same-line matches - handles cross-row matching
	const pass1 = deduplicateSameLineMatches(matches);
	const pass2 = deduplicateByDate(pass1);
	return pass2;
}

// / Remove duplicate matches - ONE assignment per line+date combination
// # Problem: A line like "2026-02-05, Quiz 1, quiz" has TWO keywords ("Quiz" and "quiz")
// # Both would create separate assignments for the same date - we only want one
function deduplicateSameLineMatches(matches: KeywordDateMatch[]): KeywordDateMatch[] {
	const seen = new Map<string, KeywordDateMatch>();

	// @ Sort matches so we process higher confidence and same-line matches first
	const sortedMatches = [...matches].sort((a, b) => {
		const confidenceOrder = { high: 0, medium: 1, low: 2 };
		const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
		if (confDiff !== 0) return confDiff;
		// # Prefer same-line matches (distance = 0)
		return a.distance - b.distance;
	});

	sortedMatches.forEach((match) => {
		// @ Key is just: keyword line number + date string
		// / This means ONE assignment per (line, date) - regardless of which keyword matched
		// / So "Quiz 1" and "quiz" on the same line with same date = 1 assignment, not 2
		const key = `line${match.keyword.lineNumber}-${match.date.dateString}`;

		if (!seen.has(key)) {
			// # First match for this line+date - keep it (already sorted by confidence)
			seen.set(key, match);
		}
		// @ If we already have a match for this line+date, skip (we kept the better one due to sorting)
	});

	return Array.from(seen.values());
}

// / Second pass: One assignment per DATE, preferring same-line matches
// # Problem: In a table, "Quiz 1" on line 1 might match date on line 2 (nearby)
// # But line 2 already has its own keyword "Homework 1" that should match that date
// # Rule: If a date has a same-line keyword, don't let other-line keywords steal it
function deduplicateByDate(matches: KeywordDateMatch[]): KeywordDateMatch[] {
	const seen = new Map<string, KeywordDateMatch>();

	// @ Sort so same-line matches (distance=0) come first, then by confidence
	const sortedMatches = [...matches].sort((a, b) => {
		// # Same-line matches should win
		if (a.distance === 0 && b.distance !== 0) return -1;
		if (b.distance === 0 && a.distance !== 0) return 1;
		// @ Then sort by confidence
		const confidenceOrder = { high: 0, medium: 1, low: 2 };
		return confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
	});

	sortedMatches.forEach((match) => {
		// @ Key is just the date - one assignment per unique date
		const key = match.date.dateString;

		const existing = seen.get(key);
		if (!existing) {
			// # First match for this date - keep it
			seen.set(key, match);
		} else if (existing.distance > 0 && match.distance === 0) {
			// @ Current match is same-line, existing is not - replace with same-line
			seen.set(key, match);
		}
		// / Otherwise keep the existing (it was same-line or came first with same confidence)
	});

	return Array.from(seen.values());
}

// / Determine if a keyword-date pair is valid
function isValidKeywordDateMatch(
	keyword: FoundKeyword,
	date: FoundDate,
	distance: number,
	lines: string[],
	courseData?: CourseData
): KeywordDateMatch | null {
	const reasoning: string[] = [];
	let confidence: 'high' | 'medium' | 'low' = 'low';
	let matchType: 'same-line' | 'stacked' | 'table-row' | 'nearby' = 'nearby';

	// # Rule 1: Same line = highest confidence
	if (distance === 0) {
		reasoning.push('Keyword and date on same line');
		confidence = 'high';
		matchType = 'same-line';
	}
	// @ Rule 2: Stacked (1-2 lines apart) = medium-high confidence
	else if (distance >= 1 && distance <= 2) {
		reasoning.push(`Keyword and date stacked (${distance} line${distance > 1 ? 's' : ''} apart)`);
		confidence = 'high';
		matchType = 'stacked';

		// / Check if they're in a list context
		if (isListContext(keyword.context)) {
			reasoning.push('Found in list context');
			confidence = 'high';
		}
	}
	// # Rule 3: Table row context (pipe characters indicate table)
	else if (distance === 0 && isTableContext(keyword.context, date.context)) {
		reasoning.push('Keyword and date in same table row');
		confidence = 'high';
		matchType = 'table-row';
	}
	// @ Rule 4: Too far apart = lower confidence
	else if (distance > 5) {
		reasoning.push('Keyword and date too far apart');
		return null; // Don't match if too far
	} else {
		reasoning.push(`Keyword and date ${distance} lines apart`);
		confidence = 'medium';
		matchType = 'nearby';
	}

	// / Additional confidence adjustments
	if (date.confidence === 'low') {
		reasoning.push('Date has low confidence');
		confidence = downgradeConfidence(confidence);
	}

	if (date.requiresReview) {
		// @ Provide specific reason based on date type
		if (date.type === 'explicit') {
			// / Explicit date outside semester range - might be before class or during break
			reasoning.push('Date falls outside semester range - verify this is correct');
		} else {
			// / Week or session reference that's ambiguous
			reasoning.push('Date requires user review (ambiguous week/session reference)');
		}
		if (confidence === 'high') {
			confidence = 'medium';
		}
	}

	// @ If course has future assignments that may not have dates yet,
	// @ be more lenient with missing date information
	if (courseData?.hasFutureAssignments) {
		reasoning.push('Syllabus contains assignments that may be posted later');
		// This helps provide context about why some assignments might lack clear dates
	}

	// # Check for conflicting keywords on same line (suggests list of different assignments)
	if (hasConflictingKeywords(keyword, lines)) {
		reasoning.push('Multiple keywords on same line - ensure correct pairing');
		if (confidence === 'high') {
			confidence = 'medium';
		}
	}

	return {
		keyword,
		date,
		distance,
		confidence,
		matchType,
		reasoning,
	};
}

// / Check if context looks like a list
function isListContext(context: string): boolean {
	// @ Check for list markers: numbers, dashes, bullets, etc.
	return /^(\d+\.|[-•*]|[a-z]\.)/.test(context.trim()) || /\|\s/.test(context);
}

// / Check if context looks like a table row
function isTableContext(keywordContext: string, dateContext: string): boolean {
	// # Tables often have pipe characters (|) separating columns
	const pipeCount = (keywordContext + dateContext).match(/\|/g)?.length || 0;
	return pipeCount >= 2;
}

// / Check if there are other keywords conflicting on the same line
function hasConflictingKeywords(keyword: FoundKeyword, lines: string[]): boolean {
	const line = lines[keyword.lineNumber];
	const lowerLine = line.toLowerCase();

	// # Common assignment keywords to check
	const allKeywords = ['quiz', 'assignment', 'project', 'essay', 'homework', 'test', 'exam', 'midterm'];
	let keywordCount = 0;

	allKeywords.forEach((kw) => {
		if (lowerLine.includes(kw) && kw !== keyword.keyword.toLowerCase()) {
			keywordCount++;
		}
	});

	return keywordCount > 0;
}

// / Downgrade confidence level
function downgradeConfidence(confidence: 'high' | 'medium' | 'low'): 'high' | 'medium' | 'low' {
	if (confidence === 'high') return 'medium';
	if (confidence === 'medium') return 'low';
	return 'low';
}

// / Get color flag for confidence level
export function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
	switch (confidence) {
		case 'high':
			return 'green'; // ✅ Green flag
		case 'medium':
			return 'yellow'; // ⚠️ Yellow flag
		case 'low':
			return 'red'; // ❌ Red flag
	}
}

// / Get confidence display label
export function getConfidenceLabel(confidence: 'high' | 'medium' | 'low'): string {
	switch (confidence) {
		case 'high':
			return 'High Confidence';
		case 'medium':
			return 'Medium Confidence';
		case 'low':
			return 'Low Confidence';
	}
}
