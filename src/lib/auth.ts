import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { getDb } from '$lib/db';

let _auth: ReturnType<typeof betterAuth> | null = null;

export function getAuth(env?: { DATABASE_URL: string; GOOGLE_CLIENT_ID: string; GOOGLE_CLIENT_SECRET: string; BETTER_AUTH_SECRET: string }) {
	if (!_auth) {
		const googleClientId = env?.GOOGLE_CLIENT_ID ?? process.env.GOOGLE_CLIENT_ID ?? '';
		const googleClientSecret = env?.GOOGLE_CLIENT_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? '';
		const secret = env?.BETTER_AUTH_SECRET ?? process.env.BETTER_AUTH_SECRET ?? '';

		_auth = betterAuth({
			secret,
			database: drizzleAdapter(getDb(env?.DATABASE_URL), {
				provider: 'pg'
			}),
			socialProviders: {
				google: {
					clientId: googleClientId,
					clientSecret: googleClientSecret
				}
			},
			trustedOrigins: [
				'https://gsb-student-scheduler.pages.dev',
				'http://localhost:5173'
			]
		});
	}
	return _auth;
}
