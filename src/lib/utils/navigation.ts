// Navigation helper - uses SvelteKit's standard goto for proper URL routing
import { goto as svelteGoto } from '$app/navigation';

export function goto(path: string, options?: { replaceState?: boolean }) {
	const normalizedPath = path.startsWith('#') ? path.slice(1) : path;
	return svelteGoto(normalizedPath, options);
}
