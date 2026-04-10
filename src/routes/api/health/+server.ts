import { getDb } from '$lib/db';
import { getAuth } from '$lib/auth';
import { env } from '$env/dynamic/private';
import { json } from '@sveltejs/kit';
import { sql } from 'drizzle-orm';
import type { RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
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

		// List all tables
		const tables = await db.execute(
			sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name`
		);
		results.tables = (tables.rows as any[]).map((r) => r.table_name).join(', ');

		// Test write to verification table
		await db.execute(
			sql`INSERT INTO verification (id, identifier, value, expires_at) VALUES ('health-test', 'test', 'test', NOW() + interval '1 minute') ON CONFLICT (id) DO NOTHING`
		);
		await db.execute(sql`DELETE FROM verification WHERE id = 'health-test'`);
		results.verification_write = 'ok';
	} catch (e: any) {
		results.db_error = e.message;
	}

	// Test better-auth sign-in/social directly
	try {
		const auth = getAuth({
			DATABASE_URL: env.DATABASE_URL,
			GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
			BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET
		});
		const origin = event.url.origin;
		const req = new Request(`${origin}/api/auth/sign-in/social`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Origin: origin
			},
			body: JSON.stringify({ provider: 'google', callbackURL: '/setup' })
		});
		const resp = await auth.handler(req);
		const body = await resp.text();
		results.auth_test = `status=${resp.status} body=${body.substring(0, 300)}`;
	} catch (e: any) {
		results.auth_test = 'threw: ' + e.message + ' | ' + e.stack?.split('\n')[1];
	}

	return json(results);
}
