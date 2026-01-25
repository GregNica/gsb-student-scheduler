<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { copyToClipboard } from "$lib/utils/clipboard";
    import CopyIcon from "@lucide/svelte/icons/copy";
    import CheckIcon from "@lucide/svelte/icons/check";

    type Props = {
        code: string;
        class?: string;
    };

    let { code, class: className }: Props = $props();
    let copied = $state(false);

    function handleCopy() {
        copyToClipboard(code, { description: "Code copied to clipboard" });
        copied = true;
        setTimeout(() => (copied = false), 2000);
    }
</script>

<div class="relative {className}">
    <Button
        variant="ghost"
        size="sm"
        class="absolute right-2 top-2"
        onclick={handleCopy}
    >
        {#if copied}
            <CheckIcon class="h-4 w-4" />
        {:else}
            <CopyIcon class="h-4 w-4" />
        {/if}
    </Button>
    <pre class="bg-muted p-4 rounded-lg text-sm overflow-x-auto"><code>{code}</code></pre>
</div>
