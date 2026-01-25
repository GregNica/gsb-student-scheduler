// @ Keyword matcher utility
// # Purpose: Find assignment keywords in document text

import { DEFAULT_KEYWORDS, getAllKeywords, type CourseData } from './courseStorage';

// / Define found keyword structure
export interface FoundKeyword {
	keyword: string;
	type: string; // quiz, assignment, project, etc.
	lineNumber: number;
	columnPosition: number; // Position within the line
	context: string;
	isCustom: boolean;
}

// / Extract all keywords from course data
export function buildKeywordList(courseData: CourseData): Map<string, string> {
	const keywords = new Map<string, string>();

	// # Get all keywords (defaults + custom)
	const allKeywords = getAllKeywords(courseData);

	// @ Add all default keywords
	DEFAULT_KEYWORDS.forEach((keyword) => {
		keywords.set(keyword.toLowerCase(), 'default');
	});

	// / Parse custom keywords from otherKeywords field
	if (courseData.otherKeywords.trim()) {
		const customKeywords = courseData.otherKeywords
			.split(',')
			.map((kw) => kw.trim().toLowerCase())
			.filter((kw) => kw.length > 0 && !DEFAULT_KEYWORDS.map(k => k.toLowerCase()).includes(kw));

		customKeywords.forEach((kw) => {
			keywords.set(kw, 'custom');
		});
	}

	return keywords;
}

// / Find all keyword occurrences in document
export function findKeywords(lines: string[], keywordMap: Map<string, string>): FoundKeyword[] {
	const found: FoundKeyword[] = [];

	// # Convert keyword map to sorted array (longest first to avoid partial matches)
	const sortedKeywords = Array.from(keywordMap.keys()).sort((a, b) => b.length - a.length);

	// @ Scan each line for keywords
	lines.forEach((line, lineIndex) => {
		const lowerLine = line.toLowerCase();

		sortedKeywords.forEach((keyword) => {
			// / Use word boundary regex to match whole words only
			const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
			let match;

			while ((match = regex.exec(lowerLine)) !== null) {
				found.push({
					keyword,
					type: keywordMap.get(keyword) || 'custom',
					lineNumber: lineIndex,
					columnPosition: match.index,
					context: line,
					isCustom: keywordMap.get(keyword) === 'custom',
				});
			}
		});
	});

	return found;
}

// / Check if a keyword is likely part of an assignment reference vs just a mention
// @ Rules:
// 1. Keyword followed by number (Quiz 1, Assignment 5) = likely assignment
// 2. Keyword in a list context (indented, numbered) = likely assignment
// 3. Keyword with "due" nearby = likely assignment
export function isLikelyAssignmentKeyword(
	keyword: FoundKeyword,
	context: string,
	surroundingLines: string[]
): { isLikely: boolean; confidence: 'high' | 'medium' | 'low' } {
	const contextLower = context.toLowerCase();

	// # Pattern 1: Assignment with number (Quiz 1, Project 3)
	if (/\b\w+\s*\d{1,2}\b/.test(context)) {
		return { isLikely: true, confidence: 'high' };
	}

	// @ Pattern 2: Contains "due" keyword
	if (contextLower.includes('due') || contextLower.includes('due date')) {
		return { isLikely: true, confidence: 'high' };
	}

	// / Pattern 3: Contains "submit" or "submission"
	if (contextLower.includes('submit') || contextLower.includes('submission')) {
		return { isLikely: true, confidence: 'high' };
	}

	// # Pattern 4: Looks like a list item (starts with number, dash, bullet)
	if (/^(\d+\.|[-•*]|[a-z]\.)/.test(context.trim())) {
		return { isLikely: true, confidence: 'high' };
	}

	// @ Pattern 5: Part of a table (multiple pipe characters nearby)
	const surroundingContext = [...surroundingLines, context].join(' | ');
	if ((surroundingContext.match(/\|/g) || []).length > 2) {
		return { isLikely: true, confidence: 'medium' };
	}

	// / Pattern 6: Just mentioned in text (lower confidence)
	return { isLikely: true, confidence: 'medium' };
}

// / Extract assignment name from context around keyword
export function extractAssignmentName(
	keyword: FoundKeyword,
	lines: string[],
	lookBefore: number = 1,
	lookAfter: number = 1
): string {
	const context = keyword.context;
	const lowerContext = context.toLowerCase();
	const keywordIndex = lowerContext.indexOf(keyword.keyword);

	// # Look for assignment number (Quiz 1, Assignment 5)
	const numberMatch = context.slice(keywordIndex).match(/\b(\d{1,2})\b/);
	if (numberMatch) {
		// @ Extract text with number: "Quiz 1" or "Project 3"
		const beforeText = context.slice(0, keywordIndex).trim().split(/\s+/).pop() || '';
		return `${beforeText} ${keyword.keyword.charAt(0).toUpperCase() + keyword.keyword.slice(1)} ${numberMatch[1]}`.trim();
	}

	// / Look for descriptive text after keyword
	const afterKeyword = context.slice(keywordIndex + keyword.keyword.length).trim();
	const descriptionMatch = afterKeyword.match(/^[:\s-]*([^,\n.;:]+)/);
	if (descriptionMatch) {
		const description = descriptionMatch[1].trim();
		if (description.length > 0 && description.length < 100) {
			return `${keyword.keyword.charAt(0).toUpperCase() + keyword.keyword.slice(1)}: ${description}`;
		}
	}

	// # Look for text before keyword (e.g., "Midterm Exam" for keyword "exam")
	const beforeContext = context.slice(0, keywordIndex).trim();
	if (beforeContext.length > 0) {
		const words = beforeContext.split(/\s+/);
		if (words.length > 0) {
			const lastWords = words.slice(-2).join(' '); // Last 2 words
			if (lastWords.length > 0 && lastWords.length < 100) {
				return `${lastWords} ${keyword.keyword.charAt(0).toUpperCase() + keyword.keyword.slice(1)}`;
			}
		}
	}

	// @ Fallback: use the keyword itself
	return keyword.keyword.charAt(0).toUpperCase() + keyword.keyword.slice(1);
}
