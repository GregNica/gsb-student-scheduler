// @ Schedule review session storage utility
// # Purpose: Manage the temporary review session for course schedule validation
// # Borrows storage pattern from reviewStorage.ts but uses schedule-specific types

import type { ParsedCourse } from './scheduleParser';
import type { ScheduleScanResult } from './scheduleScannerMain';

// / A course in review — same as ParsedCourse (editable by user)
export interface ReviewedCourse extends ParsedCourse {}

// / A date range with start and end dates
export interface DateRange {
	start: string; // ISO date YYYY-MM-DD
	end: string;   // ISO date YYYY-MM-DD
	label?: string; // Optional label (e.g., "Sp1", "SpIW1")
}

// / Structure of a schedule review session
export interface ScheduleReviewSession {
	scanResult: ScheduleScanResult;
	courses: ReviewedCourse[];
	editedByUser: Record<string, boolean>;
	semesterLabel: string;
	semesterStart: string; // ISO date YYYY-MM-DD (first range start, for backward compat)
	semesterEnd: string; // ISO date YYYY-MM-DD (first range end, for backward compat)
	semesterStart2?: string; // Deprecated: use dateRanges instead
	semesterEnd2?: string; // Deprecated: use dateRanges instead
	dateRanges: DateRange[]; // All selected date ranges
	timestamp: number;
}

const STORAGE_KEY = 'scheduleReviewSession';

// / Store schedule scan results in sessionStorage
// @ Borrowed from reviewStorage.ts storeScanResults()
export function storeScheduleScanResults(
	scanResult: ScheduleScanResult,
	semesterLabel: string,
	dateRanges: DateRange[]
): boolean {
	if (typeof window === 'undefined') return false;

	try {
		// Default per-course dateRanges from session ranges if not set by parser
		const coursesWithDates = scanResult.courses.map((c) => ({
			...c,
			dateRanges: c.dateRanges && c.dateRanges.length > 0
				? c.dateRanges
				: dateRanges.map(r => ({ start: r.start, end: r.end, label: r.label })),
		}));

		// Filter courses to only those matching the user's selected period labels
		const selectedLabels = new Set(dateRanges.map(r => r.label).filter(Boolean));
		const filteredCourses = selectedLabels.size > 0
			? coursesWithDates
				.filter(c => c.dateRanges?.some(r => r.label && selectedLabels.has(r.label)))
				.map(c => ({
					...c,
					dateRanges: c.dateRanges?.filter(r => !r.label || selectedLabels.has(r.label)),
				}))
			: coursesWithDates;

		const session: ScheduleReviewSession = {
			scanResult,
			courses: filteredCourses,
			editedByUser: {},
			semesterLabel,
			// First range for backward compat
			semesterStart: dateRanges[0]?.start || '',
			semesterEnd: dateRanges[0]?.end || '',
			dateRanges,
			timestamp: Date.now(),
		};

		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
		return true;
	} catch (error) {
		console.error('Error storing schedule scan results:', error);
		return false;
	}
}

// / Get the current schedule review session
// @ Borrowed from reviewStorage.ts getReviewSession()
export function getScheduleReviewSession(): ScheduleReviewSession | null {
	if (typeof window === 'undefined') return null;

	try {
		const stored = sessionStorage.getItem(STORAGE_KEY);
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (error) {
		console.error('Error retrieving schedule review session:', error);
	}

	return null;
}

// / Save the full session back to storage (after local edits)
function saveSession(session: ScheduleReviewSession): boolean {
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
		return true;
	} catch (error) {
		console.error('Error saving schedule review session:', error);
		return false;
	}
}

// / Update a course in the review session
// @ Borrowed from reviewStorage.ts updateAssignmentInReview()
export function updateCourseInReview(
	courseId: string,
	updates: Partial<ReviewedCourse>
): boolean {
	if (typeof window === 'undefined') return false;

	try {
		const session = getScheduleReviewSession();
		if (!session) return false;

		const index = session.courses.findIndex((c) => c.id === courseId);
		if (index === -1) return false;

		session.courses[index] = { ...session.courses[index], ...updates };
		session.editedByUser[courseId] = true;

		return saveSession(session);
	} catch (error) {
		console.error('Error updating course:', error);
		return false;
	}
}

// / Delete a course from the review session
// @ Borrowed from reviewStorage.ts deleteAssignmentFromReview()
export function deleteCourseFromReview(courseId: string): boolean {
	if (typeof window === 'undefined') return false;

	try {
		const session = getScheduleReviewSession();
		if (!session) return false;

		session.courses = session.courses.filter((c) => c.id !== courseId);
		return saveSession(session);
	} catch (error) {
		console.error('Error deleting course:', error);
		return false;
	}
}

// / Add a new manually-created course to the review session
// @ Borrowed from reviewStorage.ts addNewAssignmentToReview()
export function addNewCourseToReview(course: Omit<ReviewedCourse, 'id'>): boolean {
	if (typeof window === 'undefined') return false;

	try {
		const session = getScheduleReviewSession();
		if (!session) return false;

		const newCourse: ReviewedCourse = {
			...course,
			id: `manual-${Date.now()}-${Math.random().toString(36).substring(7)}`,
		} as ReviewedCourse;

		session.courses.push(newCourse);
		return saveSession(session);
	} catch (error) {
		console.error('Error adding course:', error);
		return false;
	}
}

// / Clear the schedule review session
// @ Borrowed from reviewStorage.ts clearReviewSession()
export function clearScheduleReviewSession(): boolean {
	if (typeof window === 'undefined') return false;

	try {
		sessionStorage.removeItem(STORAGE_KEY);
		return true;
	} catch (error) {
		console.error('Error clearing schedule review session:', error);
		return false;
	}
}

// / Get review statistics
// @ Borrowed from reviewStorage.ts getReviewStats()
export function getScheduleReviewStats(session: ScheduleReviewSession) {
	const stats = {
		totalCourses: session.courses.length,
		highConfidence: 0,
		mediumConfidence: 0,
		lowConfidence: 0,
		totalMeetings: 0,
	};

	for (const course of session.courses) {
		if (course.confidence === 'high') stats.highConfidence++;
		if (course.confidence === 'medium') stats.mediumConfidence++;
		if (course.confidence === 'low') stats.lowConfidence++;
		stats.totalMeetings += course.meetingSlots.length;
	}

	return stats;
}

// / Get list of unique professors from courses
export function getUniqueProfessors(session: ScheduleReviewSession): string[] {
	const professors = new Set<string>();
	for (const course of session.courses) {
		if (course.instructor && course.instructor.trim()) {
			professors.add(course.instructor.trim());
		}
	}
	return Array.from(professors).sort();
}
