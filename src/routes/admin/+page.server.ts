import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { allowedEmail } from '$lib/db/schema';
import { env } from '$env/dynamic/private';

export async function load({ locals }) {
	if ((locals.user as any)?.role !== 'admin') {
		redirect(302, '/setup');
	}
	const db = getDb(env.DATABASE_URL);
	const users = await db.select().from(allowedEmail).orderBy(allowedEmail.createdAt);
	return { users };
}
