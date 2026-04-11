import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	if ((locals.user as any)?.role !== 'admin') redirect(302, '/setup');
	return { user: locals.user };
}
