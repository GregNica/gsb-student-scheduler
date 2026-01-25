// @ Date finder utility
// # Purpose: Extract dates from text and handle week/session references

import type { CourseData } from './courseStorage';
import { isDateInSemester as checkDateInSemester } from './courseStorage';

// / Define found date structure
export interface FoundDate {
	dateString: string;
	date: Date | null;
	type: 'explicit' | 'week-reference' | 'session-reference' | 'relative';
	lineNumber: number;
	context: string;
	confidence: 'high' | 'medium' | 'low';
	requiresReview?: boolean; // Flag for ambiguous week/session refs
}

// / Extract all potential dates from text
export function findDates(lines: string[], courseData: CourseData): FoundDate[] {
	const foundDates: FoundDate[] = [];

	// # Define date patterns to search for
	const patterns = {
		// @ Explicit dates: Jan 15, January 15, 1/15/25, 1/15/2025, 2026-02-05 (ISO)
		// / Added YYYY-MM-DD (ISO format) which Excel commonly uses
		explicit: /(\b(?:jan|january|feb|february|mar|march|apr|april|may|june|july|aug|august|sep|september|oct|october|nov|november|dec|december)\s+\d{1,2}(?:,?\s*\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}-\d{1,2}-\d{2,4})/gi,

		// @ Week references: Week 3, Week 1, week 15
		week: /\b(week|wk)\s+(\d{1,2})\b/gi,

		// @ Session/Class references: Session 3, Class 5, Meeting 2
		session: /\b(session|class|meeting|day)\s+(\d{1,2})\b/gi,

		// @ Relative dates: Next Monday, This Friday
		relative: /\b(next|this)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi,
	};

	// / Scan each line for dates
	lines.forEach((line, lineIndex) => {
		// # Check for explicit dates
		const explicitMatches = [...line.matchAll(patterns.explicit)];
		explicitMatches.forEach((match) => {
			const date = parseExplicitDate(match[0], courseData);
			if (date) {
				// @ Check if date is within semester range
				// / Dates outside range are kept but flagged for review (not filtered out)
				// / This allows assignments due before class starts or during breaks
				const inSemester = isDateInSemester(date, courseData);

				foundDates.push({
					dateString: match[0],
					date,
					type: 'explicit',
					lineNumber: lineIndex,
					context: line,
					// # Dates outside semester get medium confidence instead of high
					confidence: inSemester ? 'high' : 'medium',
					// @ Flag for review if outside semester range
					requiresReview: !inSemester,
				});
			}
		});

		// @ Check for week references
		const weekMatches = [...line.matchAll(patterns.week)];
		weekMatches.forEach((match) => {
			const weekNumber = parseInt(match[2]);
			const result = weekNumberToDate(weekNumber, courseData);

			if (result) {
				foundDates.push({
					dateString: match[0],
					date: result.date,
					type: 'week-reference',
					lineNumber: lineIndex,
					context: line,
					confidence: result.requiresReview ? 'medium' : 'high',
					requiresReview: result.requiresReview,
				});
			}
		});

		// / Check for session/class references
		const sessionMatches = [...line.matchAll(patterns.session)];
		sessionMatches.forEach((match) => {
			const sessionNumber = parseInt(match[2]);
			const date = sessionNumberToDate(sessionNumber, courseData);

			if (date) {
				foundDates.push({
					dateString: match[0],
					date,
					type: 'session-reference',
					lineNumber: lineIndex,
					context: line,
					confidence: 'high',
				});
			}
		});
	});

	return foundDates;
}

// / Parse explicit date strings into Date objects
function parseExplicitDate(dateString: string, courseData: CourseData): Date | null {
	const normalized = dateString.toLowerCase().trim();

	// # Month mapping
	const months: Record<string, number> = {
		jan: 0,
		january: 0,
		feb: 1,
		february: 1,
		mar: 2,
		march: 2,
		apr: 3,
		april: 3,
		may: 4,
		june: 5,
		july: 6,
		aug: 7,
		august: 7,
		sep: 8,
		september: 8,
		oct: 9,
		october: 9,
		nov: 10,
		november: 10,
		dec: 11,
		december: 11,
	};

	try {
		// / Handle ISO format "YYYY-MM-DD" (common in Excel exports)
		const isoMatch = normalized.match(/(\d{4})-(\d{2})-(\d{2})/);
		if (isoMatch) {
			const year = parseInt(isoMatch[1]);
			const month = parseInt(isoMatch[2]) - 1; // JS months are 0-indexed
			const day = parseInt(isoMatch[3]);

			if (month >= 0 && month <= 11 && day > 0 && day <= 31) {
				return new Date(year, month, day);
			}
		}

		// @ Handle "Month Day, Year" or "Month Day Year" format
		const monthDayMatch = normalized.match(/(\w+)\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
		if (monthDayMatch) {
			const month = months[monthDayMatch[1]];
			const day = parseInt(monthDayMatch[2]);
			const year = monthDayMatch[3] ? parseInt(monthDayMatch[3]) : new Date().getFullYear();

			if (month !== undefined && day > 0 && day <= 31) {
				return new Date(year, month, day);
			}
		}

		// / Handle "MM/DD/YY" or "MM/DD/YYYY" format
		const slashMatch = normalized.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
		if (slashMatch) {
			const month = parseInt(slashMatch[1]) - 1;
			const day = parseInt(slashMatch[2]);
			let year = parseInt(slashMatch[3]);

			// @ Handle 2-digit years (assume 2000s)
			if (year < 100) {
				year += 2000;
			}

			if (month >= 0 && month <= 11 && day > 0 && day <= 31) {
				return new Date(year, month, day);
			}
		}
	} catch (error) {
		console.error('Error parsing date:', dateString, error);
	}

	return null;
}

// / Convert week number to actual date
// @ Returns date for first meeting day of that week, accounting for semester breaks
function weekNumberToDate(
	weekNumber: number,
	courseData: CourseData
): { date: Date; requiresReview: boolean } | null {
	const semesterStart = new Date(courseData.semesterStart);
	const semesterEnd = new Date(courseData.semesterEnd);
	const semesterStart2 = courseData.semesterStart2 ? new Date(courseData.semesterStart2) : null;
	const semesterEnd2 = courseData.semesterEnd2 ? new Date(courseData.semesterEnd2) : null;

	// # Calculate which date is in the target week
	const startOfWeek = new Date(semesterStart);
	startOfWeek.setDate(startOfWeek.getDate() + (weekNumber - 1) * 7);

	// @ Check if calculated week falls within first semester or second semester (if it exists)
	let isValidWeek = startOfWeek <= semesterEnd;
	if (!isValidWeek && semesterStart2 && semesterEnd2) {
		// Check if it falls in the second semester range
		if (startOfWeek >= semesterStart2 && startOfWeek <= semesterEnd2) {
			isValidWeek = true;
		}
	}

	if (!isValidWeek) {
		return null;
	}

	// / Count meeting days in the week
	const meetingDaysArray = [
		courseData.meetingDays.monday,
		courseData.meetingDays.tuesday,
		courseData.meetingDays.wednesday,
		courseData.meetingDays.thursday,
		courseData.meetingDays.friday,
		courseData.meetingDays.saturday,
		courseData.meetingDays.sunday,
	];

	const meetingDayCount = meetingDaysArray.filter((day) => day).length;

	// # Flag for review if multiple meeting days per week
	const requiresReview = meetingDayCount > 1;

	return {
		date: startOfWeek,
		requiresReview,
	};
}

// / Convert session/class number to date
// @ Accounts for breaks/holidays in the middle of the semester
function sessionNumberToDate(sessionNumber: number, courseData: CourseData): Date | null {
	const semesterStart = new Date(courseData.semesterStart);
	const semesterEnd = new Date(courseData.semesterEnd);
	const semesterStart2 = courseData.semesterStart2 ? new Date(courseData.semesterStart2) : null;
	const semesterEnd2 = courseData.semesterEnd2 ? new Date(courseData.semesterEnd2) : null;

	// # Get array of meeting days (0=Monday, 6=Sunday)
	const meetingDays = [
		courseData.meetingDays.monday ? 0 : -1,
		courseData.meetingDays.tuesday ? 1 : -1,
		courseData.meetingDays.wednesday ? 2 : -1,
		courseData.meetingDays.thursday ? 3 : -1,
		courseData.meetingDays.friday ? 4 : -1,
		courseData.meetingDays.saturday ? 5 : -1,
		courseData.meetingDays.sunday ? 6 : -1,
	].filter((day) => day !== -1);

	if (meetingDays.length === 0) {
		return null;
	}

	// @ Calculate session dates by iterating through semester(s)
	let sessionCount = 0;
	const currentDate = new Date(semesterStart);

	// # Handle first semester range
	while (currentDate <= semesterEnd) {
		const dayOfWeek = currentDate.getDay();

		if (meetingDays.includes(dayOfWeek)) {
			sessionCount++;

			if (sessionCount === sessionNumber) {
				return new Date(currentDate);
			}
		}

		currentDate.setDate(currentDate.getDate() + 1);
	}

	// @ If second semester exists, continue counting sessions
	if (semesterStart2 && semesterEnd2) {
		const currentDate2 = new Date(semesterStart2);

		while (currentDate2 <= semesterEnd2) {
			const dayOfWeek = currentDate2.getDay();

			if (meetingDays.includes(dayOfWeek)) {
				sessionCount++;

				if (sessionCount === sessionNumber) {
					return new Date(currentDate2);
				}
			}

			currentDate2.setDate(currentDate2.getDate() + 1);
		}
	}

	return null;
}

// / Check if date falls within semester range (accounts for holiday breaks)
function isDateInSemester(date: Date, courseData: CourseData): boolean {
	return checkDateInSemester(courseData, date.toISOString().split('T')[0]);
}

// / Format date for display
export function formatDate(date: Date): string {
	const options: Intl.DateTimeFormatOptions = {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	};
	return date.toLocaleDateString('en-US', options);
}
