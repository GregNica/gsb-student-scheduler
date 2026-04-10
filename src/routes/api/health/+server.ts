import { getDb } from '$lib/db';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';

export async function GET() {
	const db = getDb(env.DATABASE_URL);
	const users = await db.execute(sql`SELECT id, email, role FROM "user" ORDER BY created_at`);
	return json({ users: users.rows });
}
