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

	const previews = [
		{ label: 'Student View', href: '/setup' },
		{ label: 'Professor View', href: '/professor' },
	];

	async function signOut() {
		await authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/login'; } } });
	}
</script>

<ModeWatcher />

<div class="min-h-screen bg-background flex flex-col">
	<header class="border-b bg-background sticky top-0 z-10">
		<div class="max-w-5xl mx-auto px-4 flex items-center justify-between h-12">
			<div class="flex items-center gap-1">
				<!-- Admin nav tabs -->
				{#each tabs as tab}
					<a href={tab.href}
						class="px-3 py-1.5 rounded text-sm transition-colors {page.url.pathname === tab.href ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}">
						{tab.label}
					</a>
				{/each}

				<!-- Divider -->
				<span class="mx-2 text-border">|</span>

				<!-- Preview links -->
				{#each previews as preview}
					<a href={preview.href} target="_blank" rel="noopener noreferrer"
						class="px-3 py-1.5 rounded text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
						{preview.label} ↗
					</a>
				{/each}
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
