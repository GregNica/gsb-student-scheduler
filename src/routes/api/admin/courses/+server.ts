import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { courseData } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

export async function POST(event: RequestEvent) {
	if ((event.locals.user as any)?.role !== 'admin') error(403, 'Forbidden');

	const { semesters } = await event.request.json();
	// semesters: Array<{ period: SemesterPeriod, courses: ParsedCourse[] }>
	if (!Array.isArray(semesters) || semesters.length === 0) error(400, 'No data');

	const db = getDb(env.DATABASE_URL);
	for (const { period, courses } of semesters) {
		await db.insert(courseData).values({
			semesterId: period.id,
			semesterLabel: period.label,
			semesterDescription: period.description,
			semesterCategory: period.category,
			startDate: period.startDate,
			endDate: period.endDate,
			startDate2: period.startDate2 ?? null,
			endDate2: period.endDate2 ?? null,
			tentative: period.tentative ?? false,
			courses,
			updatedAt: new Date()
		}).onConflictDoUpdate({
			target: courseData.semesterId,
			set: { courses, semesterLabel: period.label, semesterDescription: period.description, semesterCategory: period.category, startDate: period.startDate, endDate: period.endDate, startDate2: period.startDate2 ?? null, endDate2: period.endDate2 ?? null, tentative: period.tentative ?? false, updatedAt: new Date() }
		});
	}

	return json({ ok: true, updated: semesters.length });
}

export async function GET(event: RequestEvent) {
	// Public — students and professors read course data
	const db = getDb(env.DATABASE_URL);
	const rows = await db.select().from(courseData).orderBy(courseData.semesterCategory, courseData.semesterLabel);
	return json(rows);
}
