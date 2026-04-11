<script lang="ts">
	import '../../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { authClient } from '$lib/auth-client';
	import { page } from '$app/state';

	let { children, data }: { children: any; data: any } = $props();

	const tabs = [
		{ label: 'Course Upload', href: '/admin' },
		{ label: 'User Management', href: '/admin/users' },
	];

	async function signOut() {
		await authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/login'; } } });
	}
</script>

<ModeWatcher />

<div class="min-h-screen bg-background flex flex-col">
	<!-- Admin nav bar -->
	<header class="border-b bg-background sticky top-0 z-10">
		<div class="max-w-5xl mx-auto px-4 flex items-center justify-between h-12">
			<div class="flex items-center gap-1">
				<span class="text-sm font-semibold text-muted-foreground mr-3">Admin</span>
				{#each tabs as tab}
					<a href={tab.href}
						class="px-3 py-1.5 rounded text-sm transition-colors {page.url.pathname === tab.href ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}">
						{tab.label}
					</a>
				{/each}
				<a href="/setup" target="_blank"
					class="px-3 py-1.5 rounded text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors ml-1">
					Student View ↗
				</a>
			</div>
			<button onclick={signOut} class="text-xs text-muted-foreground hover:text-foreground transition-colors">
				Sign out ({data?.user?.email ?? ''})
			</button>
		</div>
	</header>

	<main class="max-w-5xl mx-auto p-6 w-full flex-1">
		{@render children()}
	</main>
</div>
