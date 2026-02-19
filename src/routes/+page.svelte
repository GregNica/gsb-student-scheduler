<script lang="ts">
	import { goto } from '$lib/utils/navigation';

	// @ Redirect to schedule setup as the landing page for the pilot
	$effect(() => {
		goto('/setup', { replaceState: true });
	});
</script>
