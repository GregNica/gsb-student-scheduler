<script lang="ts">
    import { Label } from "$lib/components/ui/label";
    import type { Snippet } from "svelte";

    type Props = {
        label: string;
        description?: string;
        htmlFor?: string;
        children: Snippet;
    };

    let { label, description, htmlFor, children }: Props = $props();
</script>

<div class="flex items-center justify-between">
    <div class="space-y-0.5">
        <Label for={htmlFor}>{label}</Label>
        {#if description}
            <p class="text-sm text-muted-foreground">{description}</p>
        {/if}
    </div>
    {@render children()}
</div>
