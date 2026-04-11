<script lang="ts">
    import "../app.css";
    import { ModeWatcher } from "mode-watcher";
    import ScheduleProgressBar from "$lib/components/schedule-progress-bar.svelte";
    import ExternalLink from "@lucide/svelte/icons/external-link";
    import Mail from "@lucide/svelte/icons/mail";
    import { authClient } from "$lib/auth-client";
    import { page } from '$app/state';
    import type { LayoutData } from './$types';

    let { children, data }: { children: any, data: LayoutData } = $props();

    let isAdmin = $derived(page.url.pathname.startsWith('/admin'));

    async function signOut() {
        await authClient.signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/login'; } } });
    }
</script>

<ModeWatcher />

{#if isAdmin}
    {@render children()}
{:else}
    <div class="min-h-screen bg-background flex flex-col">
        <ScheduleProgressBar />
        <main class="max-w-4xl mx-auto p-4 w-full flex-1">
            {@render children()}
        </main>
        <footer class="max-w-4xl mx-auto w-full px-4 pb-6">
            <div class="flex justify-between items-center pt-4 text-sm text-muted-foreground">
                <span>Version {__APP_VERSION__}</span>
                {#if data.user}
                    <button onclick={signOut} class="hover:text-foreground transition-colors">
                        Sign out ({data.user.email})
                    </button>
                {/if}
                <a
                    href="https://kingoinfo.skku.edu/gaia/nxui/index.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-1.5 hover:text-foreground transition-colors text-skku-dark-green"
                >
                    KingoInfo
                    <ExternalLink class="h-4 w-4" />
                </a>
                <a
                    href="mailto:greg.nicaise@skku.edu?subject=SKK GSB Schedule to Calendar Feedback"
                    class="flex items-center gap-1.5 hover:text-foreground transition-colors"
                >
                    <Mail class="h-4 w-4" />
                    Feedback
                </a>
            </div>
        </footer>
    </div>
{/if}
