// @ Course data storage utility
// # Purpose: Persist course metadata in browser localStorage for use in file scanning

// / Define the structure of course data
export interface CourseData {
	courseName: string;
	courseNumber: string;
	otherKeywords: string; // Comma-separated custom keywords
	hasFutureAssignments: boolean;
	semesterStart: string; // ISO date string
	semesterEnd: string; // ISO date string
	// @ Optional second semester range (for semesters with holidays/breaks)
	semesterStart2: string; // ISO date string (optional)
	semesterEnd2: string; // ISO date string (optional)
	meetingDays: {
		monday: boolean;
		tuesday: boolean;
		wednesday: boolean;
		thursday: boolean;
		friday: boolean;
		saturday: boolean;
		sunday: boolean;
	};
	meetingTime: string; // HH:MM format
}

// @ Default keywords that the app always searches for
export const DEFAULT_KEYWORDS = [
	'quiz',
	'assignment',
	'project',
	'essay',
	'case study',
	'before class',
	'homework',
	'test',
	'presentation',
	'exam',
	'exercise',
	'case',
	'take-home',
];

// @ Default/empty course data
const DEFAULT_COURSE_DATA: CourseData = {
	courseName: '',
	courseNumber: '',
	otherKeywords: '',
	hasFutureAssignments: false,
	semesterStart: '',
	semesterEnd: '',
	semesterStart2: '',
	semesterEnd2: '',
	meetingDays: {
		monday: false,
		tuesday: false,
		wednesday: false,
		thursday: false,
		friday: false,
		saturday: false,
		sunday: false,
	},
	meetingTime: '10:00',
};

// / Get course data from localStorage
export function getCourseData(): CourseData {
	if (typeof window === 'undefined') {
		return DEFAULT_COURSE_DATA;
	}

	try {
		const stored = localStorage.getItem('courseData');
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (error) {
		console.error('Error reading course data from localStorage:', error);
	}

	return DEFAULT_COURSE_DATA;
}

// / Save course data to localStorage
export function saveCourseData(data: CourseData): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	try {
		localStorage.setItem('courseData', JSON.stringify(data));
		return true;
	} catch (error) {
		console.error('Error saving course data to localStorage:', error);
		return false;
	}
}

// / Clear course data from localStorage
export function clearCourseData(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	try {
		localStorage.removeItem('courseData');
		return true;
	} catch (error) {
		console.error('Error clearing course data:', error);
		return false;
	}
}

// / Check if course has been set up
export function isCourseSetup(): boolean {
	const data = getCourseData();
	return data.courseName !== '' && data.courseNumber !== '' && data.semesterStart !== '';
}

// / Get all keywords (default + custom)
export function getAllKeywords(data: CourseData): string[] {
	const keywords = [...DEFAULT_KEYWORDS];

	// @ Add custom keywords from otherKeywords field
	if (data.otherKeywords.trim()) {
		const customKeywords = data.otherKeywords
			.split(',')
			.map((kw) => kw.trim().toLowerCase())
			.filter((kw) => kw.length > 0);

		keywords.push(...customKeywords);
	}

	// / Remove duplicates
	return [...new Set(keywords)];
}

// / Check if a date falls within the active semester periods (accounting for holidays)
export function isDateInSemester(data: CourseData, dateStr: string): boolean {
	if (!dateStr || !data.semesterStart || !data.semesterEnd) {
		return false;
	}

	const date = new Date(dateStr);
	const start1 = new Date(data.semesterStart);
	const end1 = new Date(data.semesterEnd);

	// # Check if date is in first semester range
	if (date >= start1 && date <= end1) {
		return true;
	}

	// @ Check if date is in second semester range (if it exists)
	if (data.semesterStart2 && data.semesterEnd2) {
		const start2 = new Date(data.semesterStart2);
		const end2 = new Date(data.semesterEnd2);
		if (date >= start2 && date <= end2) {
			return true;
		}
	}

	return false;
}

// / Get a readable list of meeting days
export function getMeetingDays(data: CourseData): string[] {
	const days: string[] = [];

	if (data.meetingDays.monday) days.push('Monday');
	if (data.meetingDays.tuesday) days.push('Tuesday');
	if (data.meetingDays.wednesday) days.push('Wednesday');
	if (data.meetingDays.thursday) days.push('Thursday');
	if (data.meetingDays.friday) days.push('Friday');
	if (data.meetingDays.saturday) days.push('Saturday');
	if (data.meetingDays.sunday) days.push('Sunday');

	return days;
}
