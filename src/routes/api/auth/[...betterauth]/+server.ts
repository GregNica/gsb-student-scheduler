import { getAuth } from '$lib/auth';
import { toSvelteKitHandler } from 'better-auth/svelte-kit';
import { env } from '$env/dynamic/private';

const handler = (event: Parameters<ReturnType<typeof toSvelteKitHandler>>[0]) =>
	toSvelteKitHandler(
		getAuth({
			DATABASE_URL: env.DATABASE_URL,
			GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
			GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
			BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET
		})
	)(event);

export const GET = handler;
export const POST = handler;
