<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { copyToClipboard } from "$lib/utils/clipboard";
    import CopyIcon from "@lucide/svelte/icons/copy";
    import CheckIcon from "@lucide/svelte/icons/check";

    type Props = {
        value: string;
        readonly?: boolean;
        class?: string;
    };

    let { value, readonly = true, class: className }: Props = $props();
    let copied = $state(false);

    function handleCopy() {
        copyToClipboard(value);
        copied = true;
        setTimeout(() => (copied = false), 2000);
    }
</script>

<div class="flex gap-2 {className}">
    <Input {value} {readonly} class="font-mono text-xs" />
    <Button variant="outline" size="icon" onclick={handleCopy}>
        {#if copied}
            <CheckIcon class="h-4 w-4" />
        {:else}
            <CopyIcon class="h-4 w-4" />
        {/if}
    </Button>
</div>
