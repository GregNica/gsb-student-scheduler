import { redirect } from '@sveltejs/kit';

export async function load({ locals }) {
	const role = (locals.user as any)?.role;
	redirect(302, role === 'admin' ? '/admin' : '/setup');
}
