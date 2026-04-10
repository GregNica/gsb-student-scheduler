import { getAuth } from '$lib/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { redirect } from '@sveltejs/kit';
import { getDb } from '$lib/db';
import { user as userTable } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { env } from '$env/dynamic/private';

const PUBLIC_PATHS = ['/login', '/api/auth', '/access-denied'];

export async function handle({ event, resolve }) {
	const auth = getAuth({
		DATABASE_URL: env.DATABASE_URL,
		GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
		GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
		BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET
	});

	// Let BetterAuth handle its own API routes
	if (event.url.pathname.startsWith('/api/auth')) {
		return svelteKitHandler({ event, resolve, auth });
	}

	// Get the current session
	const session = await auth.api.getSession({ headers: event.request.headers });

	event.locals.user = session?.user ?? null;
	event.locals.session = session?.session ?? null;

	// Redirect unauthenticated users to login
	const isPublic = PUBLIC_PATHS.some((p) => event.url.pathname.startsWith(p));
	if (!session && !isPublic) {
		redirect(302, '/login');
	}

	if (session) {
		const email = session.user.email;
		const db = getDb(env.DATABASE_URL);
		const adminEmail = env.ADMIN_EMAIL;

		// Auto-create admin account on first login if email matches ADMIN_EMAIL
		if (email === adminEmail) {
			const existing = await db.select().from(userTable).where(eq(userTable.email, email));
			if (existing.length === 0) {
				await db.insert(userTable).values({
					id: session.user.id,
					email,
					name: session.user.name ?? email,
					role: 'admin'
				});
			} else if (existing[0].role !== 'admin') {
				await db.update(userTable).set({ role: 'admin' }).where(eq(userTable.email, email));
			}
			event.locals.user = { ...session.user, role: 'admin' } as any;
		} else {
			// Check if this user is in the database
			const existing = await db.select().from(userTable).where(eq(userTable.email, email));
			if (existing.length === 0) {
				redirect(302, '/access-denied');
			}
			event.locals.user = { ...session.user, role: existing[0].role } as any;
		}

		// Redirect logged-in users away from login page
		if (event.url.pathname === '/login') {
			redirect(302, '/setup');
		}
	}

	return resolve(event);
}
