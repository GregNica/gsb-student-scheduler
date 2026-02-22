<script lang="ts">
	// @ app.html handles the initial redirect to #/setup before SvelteKit boots.
	// This is a fallback in case the root route is somehow reached at runtime.
	import { goto } from '$lib/utils/navigation';
	$effect(() => { goto('/setup', { replaceState: true }); });
</script>
