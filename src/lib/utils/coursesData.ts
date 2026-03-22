// @ Courses data utility
// # Purpose: Types and fetch logic for the pre-loaded courses.json published by the admin app
// # The admin app (gsb-scheduler-admin) writes static/data/courses.json to this repo via GitHub API

import type { ParsedCourse } from './scheduleParser';

// / Shape of one semester's entry in courses.json
export interface SemesterData {
	id: string;
	label: string;
	description: string;
	category: string;
	dateRanges: { start: string; end: string; label: string }[];
	lastUpdated: string;
	courses: ParsedCourse[];
}

// / Shape of the full courses.json file
export interface CoursesFile {
	version: number;
	lastUpdated: string;
	semesters: Record<string, SemesterData>;
}

// / Fetch and parse courses.json from the static directory
// @ File lives at static/data/courses.json → served at ./data/courses.json relative to app root
export async function fetchCoursesData(): Promise<CoursesFile> {
	const response = await fetch('./data/courses.json');
	if (!response.ok) {
		throw new Error(`Failed to fetch course data: ${response.status} ${response.statusText}`);
	}
	const data = await response.json() as CoursesFile;
	return data;
}

// / Check whether a semester has course data published
export function semesterHasData(data: CoursesFile, semesterId: string): boolean {
	return semesterId in data.semesters && data.semesters[semesterId].courses.length > 0;
}

// / Get all unique instructor names across all semesters (or a specific semester)
export function getInstructorsForSemester(data: CoursesFile, semesterId: string): string[] {
	const semester = data.semesters[semesterId];
	if (!semester) return [];
	const names = new Set<string>();
	for (const course of semester.courses) {
		if (course.instructor?.trim()) {
			names.add(course.instructor.trim());
		}
	}
	return Array.from(names).sort();
}

// / Get courses for a specific semester filtered by program
export function getCoursesForProgram(
	data: CoursesFile,
	semesterId: string,
	program: 'MMS' | 'FMBA'
): ParsedCourse[] {
	const semester = data.semesters[semesterId];
	if (!semester) return [];
	return semester.courses.filter((c) => c.program === program);
}

// / Get courses for a specific semester filtered by instructor name
export function getCoursesForInstructor(
	data: CoursesFile,
	semesterId: string,
	instructorName: string
): ParsedCourse[] {
	const semester = data.semesters[semesterId];
	if (!semester) return [];
	return semester.courses.filter(
		(c) => c.instructor?.trim().toLowerCase() === instructorName.toLowerCase()
	);
}
