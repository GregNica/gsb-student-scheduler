import { json, error } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { allowedEmail } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';
import type { RequestEvent } from '@sveltejs/kit';

function requireAdmin(event: RequestEvent) {
	if ((event.locals.user as any)?.role !== 'admin') {
		error(403, 'Forbidden');
	}
}

export async function GET(event: RequestEvent) {
	requireAdmin(event);
	const db = getDb(env.DATABASE_URL);
	const users = await db.select().from(allowedEmail).orderBy(allowedEmail.createdAt);
	return json(users);
}

export async function POST(event: RequestEvent) {
	requireAdmin(event);
	const { email, role } = await event.request.json();
	if (!email || !email.includes('@')) error(400, 'Invalid email');
	if (!['student', 'professor', 'admin'].includes(role)) error(400, 'Invalid role');

	const db = getDb(env.DATABASE_URL);
	await db.insert(allowedEmail).values({ email: email.trim().toLowerCase(), role }).onConflictDoUpdate({
		target: allowedEmail.email,
		set: { role }
	});
	return json({ ok: true });
}

export async function DELETE(event: RequestEvent) {
	requireAdmin(event);
	const { email } = await event.request.json();
	if (!email) error(400, 'Email required');

	const db = getDb(env.DATABASE_URL);
	await db.delete(allowedEmail).where(eq(allowedEmail.email, email.trim().toLowerCase()));
	return json({ ok: true });
}
