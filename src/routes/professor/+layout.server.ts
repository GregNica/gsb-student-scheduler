import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	const role = (locals.user as any)?.role;
	if (role !== 'professor' && role !== 'admin') redirect(302, '/setup');
	return { user: locals.user };
}
