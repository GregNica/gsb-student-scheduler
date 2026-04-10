import { auth } from '$lib/auth';
import { toSvelteKitHandler } from 'better-auth/svelte-kit';

export const GET = toSvelteKitHandler(auth);
export const POST = toSvelteKitHandler(auth);
