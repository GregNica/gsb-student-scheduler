<script lang="ts">

	let error = $state('');
	let loading = $state(false);

	async function signInWithGoogle() {
		error = '';
		loading = true;
		try {
			const resp = await fetch('/api/auth/sign-in/social', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ provider: 'google', callbackURL: '/setup' }),
				redirect: 'manual'
			});

			// 302/307 redirect — extract Location and navigate
			if (resp.type === 'opaqueredirect' || resp.status === 302 || resp.status === 307) {
				const location = resp.headers.get('location');
				if (location) { window.location.href = location; return; }
			}

			// JSON response with url field
			if (resp.ok) {
				const data = await resp.json().catch(() => null);
				if (data?.url) { window.location.href = data.url; return; }
				if (data?.redirect) { window.location.href = data.redirect; return; }
			}

			const body = await resp.text().catch(() => '');
			error = `Error ${resp.status}: ${body || 'No details'}`;
			loading = false;
		} catch (e: any) {
			error = e?.message ?? 'Sign in failed. Please try again.';
			loading = false;
		}
	}
</script>

<div class="min-h-screen flex items-center justify-center bg-background">
	<div class="w-full max-w-sm space-y-6 text-center">
		<div class="space-y-2">
			<h1 class="text-2xl font-bold text-skku-blue">GSB Student Scheduler</h1>
			<p class="text-muted-foreground">Sign in to access your course calendar</p>
		</div>

		{#if error}
			<p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
		{/if}

		<button
			onclick={signInWithGoogle}
			disabled={loading}
			class="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border rounded-lg bg-background hover:bg-muted transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
		>
			<svg class="h-5 w-5" viewBox="0 0 24 24">
				<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
				<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
				<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
				<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
			</svg>
			{loading ? 'Redirecting...' : 'Sign in with Google'}
		</button>

		<p class="text-xs text-muted-foreground">
			Access is restricted to SKKU GSB members
		</p>
	</div>
</div>
