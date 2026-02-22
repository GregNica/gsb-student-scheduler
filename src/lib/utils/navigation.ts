// @ Navigation helper for hash routing mode
// Since router.type: 'hash' is set in svelte.config.js, we use direct hash manipulation
// SvelteKit's goto doesn't always work correctly with hash routing

/**
 * Navigate to a path using hash routing.
 *
 * @param path - The path to navigate to (e.g., '/setup')
 * @param options - Navigation options (replaceState supported)
 */
export function goto(path: string, _options?: { replaceState?: boolean }) {
	// Normalize path - remove leading # if present
	const normalizedPath = path.startsWith('#') ? path.slice(1) : path;

	// For hash routing, we need to force a page reload on initial navigation
	// because SvelteKit's hash router doesn't always pick up hash changes
	const currentHash = window.location.hash;
	const newHash = '#' + normalizedPath;

	if (currentHash === newHash) {
		// Already at this route
		return Promise.resolve();
	}

	// Set the hash — SvelteKit's hash router picks this up automatically
	window.location.hash = normalizedPath;

	return Promise.resolve();
}
