<script lang="ts">
    import "../app.css";
    import { ModeWatcher } from "mode-watcher";
    import ScheduleProgressBar from "$lib/components/schedule-progress-bar.svelte";

    let { children } = $props();
</script>

<ModeWatcher />

<div class="min-h-screen bg-background">
    <ScheduleProgressBar />
    <main class="max-w-4xl mx-auto p-4">
        {@render children()}
    </main>
</div>
