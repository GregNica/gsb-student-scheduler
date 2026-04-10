<script lang="ts">
	import { authClient } from '$lib/auth-client';

	async function signOut() {
		await authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/login'; } } });
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-background">
	<div class="w-full max-w-sm space-y-6 text-center">
		<div class="space-y-2">
			<h1 class="text-2xl font-bold">Access Denied</h1>
			<p class="text-muted-foreground">
				Your account has not been added to this system yet.
				Please contact your program administrator.
			</p>
		</div>
		<button
			onclick={signOut}
			class="text-sm text-skku-blue hover:underline"
		>
			Sign out and try a different account
		</button>
	</div>
</div>
