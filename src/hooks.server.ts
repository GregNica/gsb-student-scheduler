import { auth } from '$lib/auth';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { redirect } from '@sveltejs/kit';

const PUBLIC_PATHS = ['/login', '/api/auth'];

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

	// Redirect logged-in users away from login page
	if (session && event.url.pathname === '/login') {
		redirect(302, '/setup');
	}

	return resolve(event);
}
