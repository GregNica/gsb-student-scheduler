import { auth } from '$lib/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/db';
import { user as userTable } from '$lib/db/schema';
import { eq } from 'drizzle-orm';
import { ADMIN_EMAIL } from '$env/static/private';

const PUBLIC_PATHS = ['/login', '/api/auth', '/access-denied'];

export async function handle({ event, resolve }) {
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

		// Auto-create admin account on first login if email matches ADMIN_EMAIL
		if (email === ADMIN_EMAIL) {
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
				// Not in the database — deny access
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
