import { getDb } from '$lib/db';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';

export async function GET() {
	const results: Record<string, string> = {};

	results.DATABASE_URL = env.DATABASE_URL ? 'set' : 'MISSING';
	results.GOOGLE_CLIENT_ID = env.GOOGLE_CLIENT_ID ? 'set' : 'MISSING';
	results.GOOGLE_CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET ? 'set' : 'MISSING';
	results.BETTER_AUTH_SECRET = env.BETTER_AUTH_SECRET ? 'set' : 'MISSING';
	results.ADMIN_EMAIL = env.ADMIN_EMAIL ? 'set' : 'MISSING';

	try {
		const db = getDb(env.DATABASE_URL);
		await db.execute(sql`SELECT 1`);
		results.db = 'connected';
	} catch (e: any) {
		results.db = 'error: ' + e.message;
	}

	return json(results);
}
