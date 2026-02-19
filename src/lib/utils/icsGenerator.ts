// @ ICS Calendar File Generator
// # Purpose: Generate .ics (iCalendar) files for course schedules with recurring events
// # The .ics format works universally with Google Calendar, Outlook, Apple Calendar, etc.

import type { ReviewedCourse, DateRange } from './scheduleReviewStorage';
import type { MeetingSlot } from './scheduleParser';

// / Map day names to iCalendar BYDAY codes
const DAY_TO_RRULE: Record<string, string> = {
	Monday: 'MO',
	Tuesday: 'TU',
	Wednesday: 'WE',
	Thursday: 'TH',
	Friday: 'FR',
	Saturday: 'SA',
	Sunday: 'SU',
};

// / Map day names to JS Date getDay() values (0=Sunday, 1=Monday, etc.)
const DAY_TO_INDEX: Record<string, number> = {
	Sunday: 0,
	Monday: 1,
	Tuesday: 2,
	Wednesday: 3,
	Thursday: 4,
	Friday: 5,
	Saturday: 6,
};

// / Generate a unique ID for an event
function generateUID(courseCode: string, day: string): string {
	const random = Math.random().toString(36).substring(2, 10);
	const sanitized = courseCode.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
	return `${sanitized}-${day.toLowerCase()}-${random}@skku-schedule`;
}

// / Format a Date to iCalendar date-time format (YYYYMMDDTHHMMSS)
function formatICSDateTime(date: Date, time: string): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const [hours, minutes] = time.split(':');
	return `${year}${month}${day}T${hours}${minutes}00`;
}

// / Format a Date to iCalendar date format (YYYYMMDD)
function formatICSDate(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}${month}${day}`;
}

// / Get current timestamp in iCalendar format
function getICSTimestamp(): string {
	const now = new Date();
	return formatICSDate(now) + 'T' +
		String(now.getHours()).padStart(2, '0') +
		String(now.getMinutes()).padStart(2, '0') +
		String(now.getSeconds()).padStart(2, '0') + 'Z';
}

// / Find the first occurrence of a given day of week on or after a start date
function findFirstOccurrence(startDate: Date, dayName: string): Date {
	const targetDay = DAY_TO_INDEX[dayName];
	const result = new Date(startDate);

	// Move forward until we hit the target day
	while (result.getDay() !== targetDay) {
		result.setDate(result.getDate() + 1);
	}

	return result;
}

// / Escape special characters in iCalendar text fields
function escapeICSText(text: string): string {
	return text
		.replace(/\\/g, '\\\\')
		.replace(/;/g, '\\;')
		.replace(/,/g, '\\,')
		.replace(/\n/g, '\\n');
}

// / Options for ICS generation
interface ICSOptions {
	includeInstructor?: boolean;
	includeProgram?: boolean; // Include [FMBA]/[MMS] prefix in event titles (professor mode)
}

// / Generate a single VEVENT block for a course meeting
function generateVEvent(
	course: ReviewedCourse,
	slot: MeetingSlot,
	semesterStart: Date,
	semesterEnd: Date,
	options: ICSOptions = {}
): string {
	const uid = generateUID(course.courseCode || course.courseTitle, slot.day);
	const timestamp = getICSTimestamp();

	// Find the first occurrence of this day in the semester
	const firstOccurrence = findFirstOccurrence(semesterStart, slot.day);

	// If the first occurrence is after semester end, skip this event
	if (firstOccurrence > semesterEnd) {
		return '';
	}

	// Format start and end times
	const dtStart = formatICSDateTime(firstOccurrence, slot.startTime);
	const dtEnd = formatICSDateTime(firstOccurrence, slot.endTime);

	// RRULE: weekly recurrence until semester end
	const untilDate = formatICSDate(semesterEnd) + 'T235959Z';
	const rruleDay = DAY_TO_RRULE[slot.day] || 'MO';
	const rrule = `FREQ=WEEKLY;BYDAY=${rruleDay};UNTIL=${untilDate}`;

	// Build event summary (title)
	// @ Include program classification (FMBA/MMS) only for professor mode
	const programPrefix = options.includeProgram && course.program && course.program !== 'unknown'
		? `[${course.program}] `
		: '';
	const summary = course.courseCode
		? `${programPrefix}${course.courseTitle} (${course.courseCode})`
		: `${programPrefix}${course.courseTitle}`;

	// Build description
	const descriptionParts: string[] = [];
	if (options.includeProgram && course.program && course.program !== 'unknown') {
		descriptionParts.push(`Program: ${course.program}`);
	}
	if (course.instructor && options.includeInstructor !== false) {
		descriptionParts.push(`Instructor: ${course.instructor}`);
	}
	if (course.credits) {
		descriptionParts.push(`Credits: ${course.credits}`);
	}
	if (course.campus) {
		descriptionParts.push(`Campus: ${course.campus}`);
	}
	const description = descriptionParts.join('\\n');

	// Build location
	const location = slot.room || '';

	// Construct the VEVENT
	const lines = [
		'BEGIN:VEVENT',
		`UID:${uid}`,
		`DTSTAMP:${timestamp}`,
		`DTSTART:${dtStart}`,
		`DTEND:${dtEnd}`,
		`RRULE:${rrule}`,
		`SUMMARY:${escapeICSText(summary)}`,
	];

	if (location) {
		lines.push(`LOCATION:${escapeICSText(location)}`);
	}

	if (description) {
		lines.push(`DESCRIPTION:${description}`);
	}

	lines.push('END:VEVENT');

	return lines.join('\r\n');
}

// / Generate a complete .ics calendar file for all courses
export function generateICSCalendar(
	courses: ReviewedCourse[],
	dateRanges: DateRange[],
	calendarName: string = 'Course Schedule',
	options: ICSOptions = {}
): string {
	// Calendar header
	const header = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//SKKU Schedule Generator//EN',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		`X-WR-CALNAME:${escapeICSText(calendarName)}`,
	].join('\r\n');

	// Generate events for each course using per-course date ranges (if available)
	// or falling back to the global session date ranges
	const events: string[] = [];

	for (const course of courses) {
		const courseRanges = (course.dateRanges && course.dateRanges.length > 0)
			? course.dateRanges
			: dateRanges;

		for (const range of courseRanges) {
			const startDate = new Date(range.start);
			const endDate = new Date(range.end);

			for (const slot of course.meetingSlots) {
				const event = generateVEvent(course, slot, startDate, endDate, options);
				if (event) {
					events.push(event);
				}
			}
		}
	}

	// Calendar footer
	const footer = 'END:VCALENDAR';

	// Combine all parts
	return header + '\r\n' + events.join('\r\n') + '\r\n' + footer;
}

// / Trigger a download of the .ics file
export function downloadICSFile(
	icsContent: string,
	filename: string = 'schedule.ics'
): void {
	const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	URL.revokeObjectURL(url);
}

// / Generate and download an .ics file for courses
export function generateAndDownloadICS(
	courses: ReviewedCourse[],
	dateRanges: DateRange[],
	semesterLabel: string = 'Schedule',
	options: ICSOptions = {}
): void {
	const calendarName = `${semesterLabel} - Course Schedule`;
	const icsContent = generateICSCalendar(
		courses,
		dateRanges,
		calendarName,
		options
	);

	// Create filename from semester label
	const safeLabel = semesterLabel.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
	const filename = `${safeLabel}-schedule.ics`;

	downloadICSFile(icsContent, filename);
}
