// @ Courses data utility
// # Purpose: Types and fetch logic for course data stored in the database

import type { ParsedCourse } from './scheduleParser';

// / Shape of one semester's entry
export interface SemesterData {
	id: string;
	label: string;
	description: string;
	category: string;
	dateRanges: { start: string; end: string; label: string }[];
	lastUpdated: string;
	courses: ParsedCourse[];
}

// / Shape of the full courses data structure
export interface CoursesFile {
	version: number;
	lastUpdated: string;
	semesters: Record<string, SemesterData>;
}

// / Fetch course data from the database API
export async function fetchCoursesData(): Promise<CoursesFile> {
	const response = await fetch('/api/admin/courses');
	if (!response.ok) {
		throw new Error(`Failed to fetch course data: ${response.status} ${response.statusText}`);
	}
	const rows: any[] = await response.json();

	// Convert DB rows into the CoursesFile shape
	const semesters: Record<string, SemesterData> = {};
	let lastUpdated = new Date(0).toISOString();

	for (const row of rows) {
		const dateRanges: { start: string; end: string; label: string }[] = [
			{ start: row.startDate, end: row.endDate, label: row.semesterLabel }
		];
		if (row.startDate2 && row.endDate2) {
			dateRanges.push({ start: row.startDate2, end: row.endDate2, label: row.semesterLabel });
		}
		semesters[row.semesterId] = {
			id: row.semesterId,
			label: row.semesterLabel,
			description: row.semesterDescription,
			category: row.semesterCategory,
			dateRanges,
			lastUpdated: row.updatedAt,
			courses: row.courses as ParsedCourse[]
		};
		if (row.updatedAt > lastUpdated) lastUpdated = row.updatedAt;
	}

	return { version: 1, lastUpdated, semesters };
}

export function semesterHasData(data: CoursesFile, semesterId: string): boolean {
	return semesterId in data.semesters && data.semesters[semesterId].courses.length > 0;
}

export function getInstructorsForSemester(data: CoursesFile, semesterId: string): string[] {
	const semester = data.semesters[semesterId];
	if (!semester) return [];
	const names = new Set<string>();
	for (const course of semester.courses) {
		if (course.instructor?.trim()) names.add(course.instructor.trim());
	}
	return Array.from(names).sort();
}

export function getCoursesForProgram(data: CoursesFile, semesterId: string, program: 'MMS' | 'FMBA'): ParsedCourse[] {
	const semester = data.semesters[semesterId];
	if (!semester) return [];
	return semester.courses.filter((c) => c.program === program);
}

export function getCoursesForInstructor(data: CoursesFile, semesterId: string, instructorName: string): ParsedCourse[] {
	const semester = data.semesters[semesterId];
	if (!semester) return [];
	return semester.courses.filter((c) => c.instructor?.trim().toLowerCase() === instructorName.toLowerCase());
}
