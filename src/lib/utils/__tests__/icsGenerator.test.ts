import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateICSCalendar } from '../icsGenerator';
import type { ReviewedCourse } from '../scheduleReviewStorage';
import type { DateRange } from '../scheduleReviewStorage';

// Freeze time so DTSTAMP is deterministic across all tests
const FROZEN_DATE = new Date('2026-01-01T00:00:00Z');
beforeEach(() => vi.useFakeTimers({ now: FROZEN_DATE }));
afterEach(() => vi.useRealTimers());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCourse(overrides: Partial<ReviewedCourse> = {}): ReviewedCourse {
	return {
		id: 'test-id',
		courseCode: 'MMS5002',
		courseTitle: 'Strategy',
		instructor: 'Kim Minsu',
		credits: '3',
		campus: 'Seoul',
		program: 'MMS',
		meetingSlots: [
			{
				day: 'Tuesday',
				dayCode: 'Tue',
				startTime: '17:10',
				endTime: '18:50',
				room: '9B113',
			},
		],
		dateRanges: [],
		confidence: 'high',
		reasons: [],
		sourceRows: [0, 0, 0],
		rawTimeRoom: 'Tue17:10-18:50【9B113】',
		...overrides,
	};
}

const SP1_RANGES: DateRange[] = [{ start: '2026-01-12', end: '2026-02-27' }];

// Strip DTSTAMP line so comparisons aren't date-dependent (belt-and-suspenders
// alongside useFakeTimers — handles any format variation)
function stripDtstamp(ics: string): string {
	return ics
		.split('\r\n')
		.filter((l) => !l.startsWith('DTSTAMP:'))
		.join('\r\n');
}

// ---------------------------------------------------------------------------
// Calendar structure
// ---------------------------------------------------------------------------

describe('generateICSCalendar — structure', () => {
	it('wraps output in BEGIN/END:VCALENDAR', () => {
		const output = generateICSCalendar([], []);
		expect(output).toContain('BEGIN:VCALENDAR');
		expect(output).toContain('END:VCALENDAR');
	});

	it('uses CRLF line endings (RFC 5545)', () => {
		const output = generateICSCalendar([], []);
		expect(output).toContain('\r\n');
	});

	it('sets default calendar name', () => {
		expect(generateICSCalendar([], [])).toContain('X-WR-CALNAME:Course Schedule');
	});

	it('uses a custom calendar name', () => {
		expect(generateICSCalendar([], [], 'My SKKU')).toContain('X-WR-CALNAME:My SKKU');
	});

	it('produces no VEVENT for empty courses array', () => {
		expect(generateICSCalendar([], [])).not.toContain('BEGIN:VEVENT');
	});
});

// ---------------------------------------------------------------------------
// VEVENT content — student mode (default)
// ---------------------------------------------------------------------------

describe('generateICSCalendar — student mode VEVENT', () => {
	it('generates a VEVENT for each meeting slot', () => {
		const output = generateICSCalendar([makeCourse()], SP1_RANGES);
		expect(output).toContain('BEGIN:VEVENT');
		expect(output).toContain('END:VEVENT');
	});

	it('DTSTART is the first Tuesday on or after Jan 12 2026 (= Jan 13)', () => {
		const output = generateICSCalendar([makeCourse()], SP1_RANGES);
		expect(output).toContain('DTSTART:20260113T171000');
	});

	it('DTEND matches slot end time on the same first occurrence', () => {
		const output = generateICSCalendar([makeCourse()], SP1_RANGES);
		expect(output).toContain('DTEND:20260113T185000');
	});

	it('RRULE has correct weekly recurrence until semester end', () => {
		const output = generateICSCalendar([makeCourse()], SP1_RANGES);
		expect(output).toContain('RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=20260227T235959Z');
	});

	it('SUMMARY contains course title and code', () => {
		const output = generateICSCalendar([makeCourse()], SP1_RANGES);
		expect(output).toContain('SUMMARY:Strategy (MMS5002)');
	});

	it('SUMMARY omits code when courseCode is empty', () => {
		const output = generateICSCalendar(
			[makeCourse({ courseCode: '' })],
			SP1_RANGES,
		);
		expect(output).toContain('SUMMARY:Strategy');
		expect(output).not.toContain('SUMMARY:Strategy ()');
	});

	it('LOCATION is set to the room', () => {
		const output = generateICSCalendar([makeCourse()], SP1_RANGES);
		expect(output).toContain('LOCATION:9B113');
	});

	it('LOCATION is omitted when room is empty', () => {
		const course = makeCourse({
			meetingSlots: [{ day: 'Tuesday', dayCode: 'Tue', startTime: '17:10', endTime: '18:50', room: '' }],
		});
		const output = generateICSCalendar([course], SP1_RANGES);
		expect(output).not.toContain('LOCATION:');
	});

	it('DESCRIPTION includes instructor in student mode', () => {
		const output = generateICSCalendar([makeCourse()], SP1_RANGES);
		expect(output).toContain('Instructor: Kim Minsu');
	});

	it('DESCRIPTION includes credits and campus', () => {
		const output = generateICSCalendar([makeCourse()], SP1_RANGES);
		expect(output).toContain('Credits: 3');
		expect(output).toContain('Campus: Seoul');
	});

	it('SUMMARY has no program prefix in student mode', () => {
		const output = generateICSCalendar([makeCourse()], SP1_RANGES);
		expect(output).not.toContain('[MMS]');
	});
});

// ---------------------------------------------------------------------------
// VEVENT content — professor mode
// ---------------------------------------------------------------------------

describe('generateICSCalendar — professor mode', () => {
	const professorOptions = { includeProgram: true, includeInstructor: false };

	it('adds program prefix to SUMMARY', () => {
		const output = generateICSCalendar([makeCourse()], SP1_RANGES, 'Schedule', professorOptions);
		expect(output).toContain('SUMMARY:[MMS] Strategy (MMS5002)');
	});

	it('includes Program field in DESCRIPTION', () => {
		const output = generateICSCalendar([makeCourse()], SP1_RANGES, 'Schedule', professorOptions);
		expect(output).toContain('Program: MMS');
	});

	it('omits instructor in DESCRIPTION when includeInstructor is false', () => {
		const output = generateICSCalendar([makeCourse()], SP1_RANGES, 'Schedule', professorOptions);
		expect(output).not.toContain('Instructor:');
	});

	it('omits program prefix when program is "unknown"', () => {
		const course = makeCourse({ program: 'unknown' });
		const output = generateICSCalendar([course], SP1_RANGES, 'Schedule', professorOptions);
		expect(output).not.toContain('[unknown]');
		expect(output).toContain('SUMMARY:Strategy (MMS5002)');
	});
});

// ---------------------------------------------------------------------------
// findFirstOccurrence edge cases (tested via DTSTART)
// ---------------------------------------------------------------------------

describe('generateICSCalendar — first occurrence logic', () => {
	it('uses start date itself when it falls on the meeting day (Jan 12 = Monday)', () => {
		const course = makeCourse({
			meetingSlots: [{ day: 'Monday', dayCode: 'Mon', startTime: '09:00', endTime: '10:30', room: '' }],
		});
		// Jan 12 2026 is a Monday
		const output = generateICSCalendar([course], [{ start: '2026-01-12', end: '2026-02-27' }]);
		expect(output).toContain('DTSTART:20260112T090000');
	});

	it('skips the event entirely when first occurrence is after semester end', () => {
		const course = makeCourse({
			meetingSlots: [{ day: 'Wednesday', dayCode: 'Wed', startTime: '09:00', endTime: '10:30', room: '' }],
		});
		// Range Jan 12–13: first Wednesday (Jan 14) is after end
		const output = generateICSCalendar([course], [{ start: '2026-01-12', end: '2026-01-13' }]);
		expect(output).not.toContain('BEGIN:VEVENT');
	});
});

// ---------------------------------------------------------------------------
// Per-course dateRanges vs global fallback
// ---------------------------------------------------------------------------

describe('generateICSCalendar — date range resolution', () => {
	it('uses per-course dateRanges when present, ignoring global ranges', () => {
		const course = makeCourse({
			dateRanges: [{ start: '2026-03-02', end: '2026-03-06' }],
		});
		const globalRanges: DateRange[] = [{ start: '2026-01-12', end: '2026-02-27' }];
		const output = generateICSCalendar([course], globalRanges);
		// First Tuesday on/after Mar 2 = Mar 3
		expect(output).toContain('DTSTART:20260303T171000');
		expect(output).not.toContain('DTSTART:20260113T171000');
	});

	it('falls back to global dateRanges when course dateRanges is empty', () => {
		const output = generateICSCalendar([makeCourse()], SP1_RANGES);
		expect(output).toContain('RRULE:FREQ=WEEKLY;BYDAY=TU;UNTIL=20260227T235959Z');
	});

	it('generates two VEVENTs for a course with two separate date ranges', () => {
		const course = makeCourse({
			dateRanges: [
				{ start: '2026-01-12', end: '2026-02-15' },
				{ start: '2026-02-21', end: '2026-02-27' },
			],
		});
		const output = generateICSCalendar([course], []);
		const count = (output.match(/BEGIN:VEVENT/g) ?? []).length;
		expect(count).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// ICS text escaping
// ---------------------------------------------------------------------------

describe('generateICSCalendar — text escaping', () => {
	it('escapes commas in course title', () => {
		const course = makeCourse({ courseTitle: 'Strategy, Finance' });
		const output = generateICSCalendar([course], SP1_RANGES);
		expect(output).toContain('Strategy\\, Finance');
	});

	it('escapes semicolons in course title', () => {
		const course = makeCourse({ courseTitle: 'Ethics; Governance' });
		const output = generateICSCalendar([course], SP1_RANGES);
		expect(output).toContain('Ethics\\; Governance');
	});

	it('escapes commas in room (LOCATION field)', () => {
		const course = makeCourse({
			meetingSlots: [{ day: 'Tuesday', dayCode: 'Tue', startTime: '17:10', endTime: '18:50', room: 'Bldg A, Room 101' }],
		});
		const output = generateICSCalendar([course], SP1_RANGES);
		expect(output).toContain('LOCATION:Bldg A\\, Room 101');
	});
});
