// Tests for the pure, DOM-free functions in scheduleReviewStorage.ts.
// Functions that touch sessionStorage return false/null in Node (typeof window
// === 'undefined') and are not tested here — there is no logic to verify
// beyond the serialization roundtrip, which belongs to integration tests.

import { describe, it, expect } from 'vitest';
import {
	getScheduleReviewStats,
	getUniqueProfessors,
	type ScheduleReviewSession,
	type ReviewedCourse,
} from '../scheduleReviewStorage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCourse(overrides: Partial<ReviewedCourse> = {}): ReviewedCourse {
	return {
		id: 'test',
		courseCode: 'TST1001',
		courseTitle: 'Test',
		instructor: 'Test Instructor',
		credits: '3',
		campus: 'Seoul',
		meetingSlots: [],
		confidence: 'high',
		reasons: [],
		sourceRows: [0, 0, 0],
		rawTimeRoom: '',
		...overrides,
	};
}

// Minimal session stub — only `courses` is accessed by the tested functions
function makeSession(courses: ReviewedCourse[]): ScheduleReviewSession {
	return {
		scanResult: {} as never,
		courses,
		editedByUser: {},
		semesterLabel: '',
		semesterStart: '2026-01-12',
		semesterEnd: '2026-02-27',
		dateRanges: [],
		timestamp: 0,
		userRole: 'student',
	};
}

// ---------------------------------------------------------------------------
// getScheduleReviewStats
// ---------------------------------------------------------------------------

describe('getScheduleReviewStats', () => {
	it('returns all zeros for empty course list', () => {
		const stats = getScheduleReviewStats(makeSession([]));
		expect(stats).toEqual({
			totalCourses: 0,
			highConfidence: 0,
			mediumConfidence: 0,
			lowConfidence: 0,
			totalMeetings: 0,
		});
	});

	it('counts confidence levels correctly', () => {
		const courses = [
			makeCourse({ confidence: 'high' }),
			makeCourse({ confidence: 'high' }),
			makeCourse({ confidence: 'medium' }),
			makeCourse({ confidence: 'low' }),
		];
		const stats = getScheduleReviewStats(makeSession(courses));
		expect(stats.totalCourses).toBe(4);
		expect(stats.highConfidence).toBe(2);
		expect(stats.mediumConfidence).toBe(1);
		expect(stats.lowConfidence).toBe(1);
	});

	it('sums meeting slots across all courses', () => {
		const courses = [
			makeCourse({
				meetingSlots: [
					{ day: 'Monday', dayCode: 'Mon', startTime: '09:00', endTime: '10:30', room: '' },
					{ day: 'Wednesday', dayCode: 'Wed', startTime: '09:00', endTime: '10:30', room: '' },
				],
			}),
			makeCourse({
				meetingSlots: [
					{ day: 'Tuesday', dayCode: 'Tue', startTime: '13:00', endTime: '14:40', room: '' },
				],
			}),
		];
		const stats = getScheduleReviewStats(makeSession(courses));
		expect(stats.totalMeetings).toBe(3);
	});

	it('handles a course with no meeting slots', () => {
		const stats = getScheduleReviewStats(makeSession([makeCourse({ meetingSlots: [] })]));
		expect(stats.totalMeetings).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getUniqueProfessors
// ---------------------------------------------------------------------------

describe('getUniqueProfessors', () => {
	it('returns empty array when no courses', () => {
		expect(getUniqueProfessors(makeSession([]))).toEqual([]);
	});

	it('deduplicates the same instructor across courses', () => {
		const courses = [
			makeCourse({ instructor: 'Kim Minsu' }),
			makeCourse({ instructor: 'Kim Minsu' }),
			makeCourse({ instructor: 'Kim Minsu' }),
		];
		expect(getUniqueProfessors(makeSession(courses))).toEqual(['Kim Minsu']);
	});

	it('returns sorted list of unique instructors', () => {
		const courses = [
			makeCourse({ instructor: 'Park Jihun' }),
			makeCourse({ instructor: 'Kim Minsu' }),
			makeCourse({ instructor: 'Lee Soyeon' }),
		];
		expect(getUniqueProfessors(makeSession(courses))).toEqual([
			'Kim Minsu',
			'Lee Soyeon',
			'Park Jihun',
		]);
	});

	it('filters out empty-string instructors', () => {
		const courses = [
			makeCourse({ instructor: '' }),
			makeCourse({ instructor: 'Kim Minsu' }),
		];
		expect(getUniqueProfessors(makeSession(courses))).toEqual(['Kim Minsu']);
	});

	it('filters out whitespace-only instructors', () => {
		const courses = [
			makeCourse({ instructor: '   ' }),
			makeCourse({ instructor: 'Lee Soyeon' }),
		];
		expect(getUniqueProfessors(makeSession(courses))).toEqual(['Lee Soyeon']);
	});

	it('trims whitespace before deduplication', () => {
		const courses = [
			makeCourse({ instructor: 'Kim Minsu ' }),
			makeCourse({ instructor: ' Kim Minsu' }),
		];
		// Both trim to 'Kim Minsu' — should appear once
		expect(getUniqueProfessors(makeSession(courses))).toEqual(['Kim Minsu']);
	});
});
