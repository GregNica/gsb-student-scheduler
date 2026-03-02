import { describe, it, expect } from 'vitest';
import {
	parseClassTimeRoom,
	buildScheduleSummary,
	getConfidenceColor,
	getConfidenceLabel,
	type ParsedCourse,
} from '../scheduleParser';

// ---------------------------------------------------------------------------
// parseClassTimeRoom
// ---------------------------------------------------------------------------

describe('parseClassTimeRoom', () => {
	it('returns empty array for empty string', () => {
		expect(parseClassTimeRoom('')).toEqual([]);
	});

	it('returns empty array for whitespace-only string', () => {
		expect(parseClassTimeRoom('   ')).toEqual([]);
	});

	it('parses a single English-abbreviation slot with full-width brackets', () => {
		const slots = parseClassTimeRoom('Tue17:10-18:50【9B113】');
		expect(slots).toHaveLength(1);
		expect(slots[0]).toMatchObject({
			day: 'Tuesday',
			dayCode: 'Tue',
			startTime: '17:10',
			endTime: '18:50',
			room: '9B113',
		});
	});

	it('parses a single Korean-character slot with full-width brackets', () => {
		const slots = parseClassTimeRoom('화17:10-18:50【9B113】');
		expect(slots).toHaveLength(1);
		expect(slots[0]).toMatchObject({
			day: 'Tuesday',
			dayCode: '화',
			startTime: '17:10',
			endTime: '18:50',
			room: '9B113',
		});
	});

	it('parses all Korean day codes correctly', () => {
		const cases: [string, string][] = [
			['월', 'Monday'],
			['화', 'Tuesday'],
			['수', 'Wednesday'],
			['목', 'Thursday'],
			['금', 'Friday'],
			['토', 'Saturday'],
			['일', 'Sunday'],
		];
		for (const [code, expected] of cases) {
			const slots = parseClassTimeRoom(`${code}09:00-10:30【Room】`);
			expect(slots[0].day, `day code ${code}`).toBe(expected);
		}
	});

	it('parses all English abbreviations correctly', () => {
		const cases: [string, string][] = [
			['Mon', 'Monday'],
			['Tue', 'Tuesday'],
			['Wed', 'Wednesday'],
			['Thu', 'Thursday'],
			['Fri', 'Friday'],
			['Sat', 'Saturday'],
			['Sun', 'Sunday'],
		];
		for (const [code, expected] of cases) {
			const slots = parseClassTimeRoom(`${code}09:00-10:30【Room】`);
			expect(slots[0].day, `day code ${code}`).toBe(expected);
		}
	});

	it('parses full English day names', () => {
		const slots = parseClassTimeRoom('Thursday14:00-15:40【Online】');
		expect(slots[0].day).toBe('Thursday');
	});

	it('parses square-bracket room variant', () => {
		const slots = parseClassTimeRoom('월15:20-17:00[9B114]');
		expect(slots[0].room).toBe('9B114');
	});

	it('parses slot with no room (no brackets)', () => {
		const slots = parseClassTimeRoom('Fri09:00-10:30');
		expect(slots).toHaveLength(1);
		expect(slots[0].room).toBe('');
	});

	it('parses en-dash separator', () => {
		const slots = parseClassTimeRoom('Tue17:10–18:50【9B113】');
		expect(slots[0].startTime).toBe('17:10');
		expect(slots[0].endTime).toBe('18:50');
	});

	it('parses tilde separator', () => {
		const slots = parseClassTimeRoom('Mon09:00~10:30【A101】');
		expect(slots[0].startTime).toBe('09:00');
		expect(slots[0].endTime).toBe('10:30');
	});

	it('parses two comma-separated slots', () => {
		const slots = parseClassTimeRoom('Mon15:20-17:00【9B114】,Wed15:20-17:00【9B114】');
		expect(slots).toHaveLength(2);
		expect(slots[0].day).toBe('Monday');
		expect(slots[1].day).toBe('Wednesday');
		expect(slots[0].room).toBe('9B114');
		expect(slots[1].room).toBe('9B114');
	});

	it('parses mixed Korean and English multi-slot', () => {
		const slots = parseClassTimeRoom('Mon09:00-10:30【A101】,화13:00-14:40【B202】');
		expect(slots).toHaveLength(2);
		expect(slots[0].day).toBe('Monday');
		expect(slots[1].day).toBe('Tuesday');
	});
});

// ---------------------------------------------------------------------------
// buildScheduleSummary
// ---------------------------------------------------------------------------

function makeCourse(overrides: Partial<ParsedCourse> = {}): ParsedCourse {
	return {
		id: 'test-id',
		courseCode: 'TST1001',
		courseTitle: 'Test Course',
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

describe('buildScheduleSummary', () => {
	it('returns zeros for an empty array', () => {
		const summary = buildScheduleSummary([]);
		expect(summary.totalCourses).toBe(0);
		expect(summary.highConfidence).toBe(0);
		expect(summary.mediumConfidence).toBe(0);
		expect(summary.lowConfidence).toBe(0);
		expect(summary.totalWeeklyMeetings).toBe(0);
		expect(summary.uniqueDays).toEqual([]);
	});

	it('counts confidence levels correctly', () => {
		const courses = [
			makeCourse({ confidence: 'high' }),
			makeCourse({ confidence: 'high' }),
			makeCourse({ confidence: 'medium' }),
			makeCourse({ confidence: 'low' }),
		];
		const summary = buildScheduleSummary(courses);
		expect(summary.totalCourses).toBe(4);
		expect(summary.highConfidence).toBe(2);
		expect(summary.mediumConfidence).toBe(1);
		expect(summary.lowConfidence).toBe(1);
	});

	it('counts total weekly meetings across all course slots', () => {
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
		const summary = buildScheduleSummary(courses);
		expect(summary.totalWeeklyMeetings).toBe(3);
	});

	it('deduplicates days in uniqueDays', () => {
		const courses = [
			makeCourse({
				meetingSlots: [
					{ day: 'Monday', dayCode: 'Mon', startTime: '09:00', endTime: '10:30', room: '' },
				],
			}),
			makeCourse({
				meetingSlots: [
					{ day: 'Monday', dayCode: 'Mon', startTime: '13:00', endTime: '14:40', room: '' },
				],
			}),
		];
		const summary = buildScheduleSummary(courses);
		expect(summary.uniqueDays).toEqual(['Monday']);
	});
});

// ---------------------------------------------------------------------------
// getConfidenceColor / getConfidenceLabel
// ---------------------------------------------------------------------------

describe('getConfidenceColor', () => {
	it('returns green for high', () => expect(getConfidenceColor('high')).toBe('green'));
	it('returns yellow for medium', () => expect(getConfidenceColor('medium')).toBe('yellow'));
	it('returns red for low', () => expect(getConfidenceColor('low')).toBe('red'));
});

describe('getConfidenceLabel', () => {
	it('returns High Confidence for high', () =>
		expect(getConfidenceLabel('high')).toBe('High Confidence'));
	it('returns Medium Confidence for medium', () =>
		expect(getConfidenceLabel('medium')).toBe('Medium Confidence'));
	it('returns Low Confidence for low', () =>
		expect(getConfidenceLabel('low')).toBe('Low Confidence'));
});
