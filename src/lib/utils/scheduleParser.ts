// @ Schedule parser utility
// # Purpose: Parse SKKU schedule format — specifically the Class Time/Classroom field
// # Handles day-of-week codes (English + Korean), time ranges, and classroom in brackets
// # Borrows pattern matching from keywordMatcher.ts and dateFinder.ts

import type { RawCourseBlock, ScheduleExcelData } from './scheduleExcelReader';

// / A single meeting slot parsed from the Class Time/Classroom string
// @ e.g. "Tue17:10-18:50【9B113】" → { day: "Tuesday", startTime: "17:10", endTime: "18:50", room: "9B113" }
export interface MeetingSlot {
	day: string; // Full day name in English, e.g. "Tuesday"
	dayCode: string; // Original code from file, e.g. "Tue" or "화"
	startTime: string; // "HH:MM" format
	endTime: string; // "HH:MM" format
	room: string; // Classroom extracted from brackets
}

// / A fully parsed course ready for review
export interface ParsedCourse {
	id: string;
	courseCode: string;
	courseTitle: string;
	instructor: string;
	credits: string;
	campus: string;
	meetingSlots: MeetingSlot[]; // One or more meeting times per week
	confidence: 'high' | 'medium' | 'low';
	reasons: string[];
	sourceRows: [number, number, number];
	rawTimeRoom: string; // Original Class Time/Classroom string
}

// / Summary statistics
export interface ScheduleSummary {
	totalCourses: number;
	highConfidence: number;
	mediumConfidence: number;
	lowConfidence: number;
	uniqueDays: string[];
	totalWeeklyMeetings: number;
}

// / Day code mapping: English and Korean → full English day name
// @ Borrowed regex/mapping approach from dateFinder.ts month mapping
const DAY_CODE_MAP: Record<string, string> = {
	// English abbreviations
	mon: 'Monday',
	tue: 'Tuesday',
	tues: 'Tuesday',
	wed: 'Wednesday',
	thu: 'Thursday',
	thur: 'Thursday',
	thurs: 'Thursday',
	fri: 'Friday',
	sat: 'Saturday',
	sun: 'Sunday',
	// English full names
	monday: 'Monday',
	tuesday: 'Tuesday',
	wednesday: 'Wednesday',
	thursday: 'Thursday',
	friday: 'Friday',
	saturday: 'Saturday',
	sunday: 'Sunday',
	// Korean day codes (한글 요일)
	월: 'Monday',
	화: 'Tuesday',
	수: 'Wednesday',
	목: 'Thursday',
	금: 'Friday',
	토: 'Saturday',
	일: 'Sunday',
};

// / Regex to match a single meeting slot in the Class Time/Classroom string
// @ Handles both English and Korean day codes
// # Format: DayCode HH:MM-HH:MM【Room】 or DayCode HH:MM-HH:MM[Room]
// # Examples:
// #   "Tue17:10-18:50【9B113】"
// #   "Mon15:20-17:00【9B114】"
// #   "화17:10-18:50【9B113】"
// #   "월15:20-17:00[9B114]"
//
// @ Day code group: English (Mon|Tue|Wed|...) or Korean (월|화|수|목|금|토|일)
// @ Time group: HH:MM-HH:MM
// @ Room group: content inside 【】 or []
const SLOT_REGEX =
	/(Mon(?:day)?|Tue(?:s(?:day)?)?|Wed(?:nesday)?|Thu(?:r(?:s(?:day)?)?)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?|월|화|수|목|금|토|일)\s*(\d{1,2}:\d{2})\s*[-–~]\s*(\d{1,2}:\d{2})\s*(?:[【\[]([^\]】]*)[】\]])?/gi;

// / Parse the Class Time/Classroom string into meeting slots
// @ e.g. "Mon15:20-17:00【9B114】,Wed15:20-17:00【9B114】" → 2 slots
export function parseClassTimeRoom(raw: string): MeetingSlot[] {
	if (!raw || !raw.trim()) return [];

	const slots: MeetingSlot[] = [];

	// # Split by comma to handle multiple meeting entries
	// @ e.g. "Mon15:20-17:00【9B114】,Wed15:20-17:00【9B114】"
	const entries = raw.split(',').map((s) => s.trim()).filter((s) => s.length > 0);

	for (const entry of entries) {
		// @ Reset regex lastIndex for each entry
		SLOT_REGEX.lastIndex = 0;

		const match = SLOT_REGEX.exec(entry);
		if (match) {
			const dayCode = match[1];
			const startTime = match[2];
			const endTime = match[3];
			const room = match[4] || '';

			// / Resolve day code to full English name
			const dayLower = dayCode.toLowerCase();
			const fullDay = DAY_CODE_MAP[dayLower] || DAY_CODE_MAP[dayCode] || dayCode;

			slots.push({
				day: fullDay,
				dayCode,
				startTime,
				endTime,
				room: room.trim(),
			});
		}
	}

	return slots;
}

// / Parse all course blocks into parsed courses
export function parseScheduleBlocks(
	data: ScheduleExcelData
): { courses: ParsedCourse[]; summary: ScheduleSummary } {
	const courses: ParsedCourse[] = [];

	for (const block of data.courseBlocks) {
		const course = parseCourseBlock(block);
		if (course) {
			courses.push(course);
		}
	}

	const summary = buildScheduleSummary(courses);
	return { courses, summary };
}

// / Parse a single course block into a ParsedCourse
// @ Borrows confidence scoring from contextAnalyzer.ts
function parseCourseBlock(block: RawCourseBlock): ParsedCourse | null {
	const reasons: string[] = [];
	let confidence: 'high' | 'medium' | 'low' = 'high';

	// # Must have at least a course code or title
	if (!block.courseCode && !block.courseTitle) {
		return null;
	}

	// / Validate key fields and score confidence
	if (block.courseCode) {
		reasons.push('Course code found');
	} else {
		reasons.push('No course code');
		confidence = downgradeConfidence(confidence);
	}

	if (block.courseTitle) {
		reasons.push('Course title found');
	} else {
		reasons.push('No course title');
		confidence = downgradeConfidence(confidence);
	}

	// @ Parse the Class Time/Classroom field
	const meetingSlots = parseClassTimeRoom(block.classTimeRoom);

	if (meetingSlots.length > 0) {
		reasons.push(`${meetingSlots.length} meeting slot(s) parsed`);
	} else if (block.classTimeRoom) {
		reasons.push('Class time field present but could not parse meeting slots');
		confidence = downgradeConfidence(confidence);
	} else {
		reasons.push('No class time/room information');
		confidence = downgradeConfidence(confidence);
	}

	if (block.instructor) {
		reasons.push('Instructor found');
	} else {
		reasons.push('No instructor listed');
	}

	// / Generate ID
	const id = generateCourseId(block.courseCode || block.courseTitle, block.blockIndex);

	return {
		id,
		courseCode: block.courseCode,
		courseTitle: block.courseTitle,
		instructor: block.instructor,
		credits: block.credits,
		campus: block.campus,
		meetingSlots,
		confidence,
		reasons,
		sourceRows: block.sourceRows,
		rawTimeRoom: block.classTimeRoom,
	};
}

// / Downgrade confidence one level
// @ Borrowed from contextAnalyzer.ts downgradeConfidence()
function downgradeConfidence(confidence: 'high' | 'medium' | 'low'): 'high' | 'medium' | 'low' {
	if (confidence === 'high') return 'medium';
	if (confidence === 'medium') return 'low';
	return 'low';
}

// / Generate a unique ID for a course
function generateCourseId(name: string, blockIndex: number): string {
	const slug = name
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.substring(0, 20);
	return `course-${slug}-${blockIndex}`;
}

// / Build summary statistics
// @ Borrowed from assignmentAggregator.ts getAssignmentSummary()
function buildScheduleSummary(courses: ParsedCourse[]): ScheduleSummary {
	const allDays = new Set<string>();
	let totalWeeklyMeetings = 0;

	for (const course of courses) {
		for (const slot of course.meetingSlots) {
			allDays.add(slot.day);
			totalWeeklyMeetings++;
		}
	}

	return {
		totalCourses: courses.length,
		highConfidence: courses.filter((c) => c.confidence === 'high').length,
		mediumConfidence: courses.filter((c) => c.confidence === 'medium').length,
		lowConfidence: courses.filter((c) => c.confidence === 'low').length,
		uniqueDays: Array.from(allDays).sort(),
		totalWeeklyMeetings,
	};
}

// / Get confidence display color
// @ Borrowed from contextAnalyzer.ts getConfidenceColor()
export function getConfidenceColor(confidence: 'high' | 'medium' | 'low'): string {
	switch (confidence) {
		case 'high':
			return 'green';
		case 'medium':
			return 'yellow';
		case 'low':
			return 'red';
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
