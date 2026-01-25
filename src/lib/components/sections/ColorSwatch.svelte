<script lang="ts">
    import * as Tooltip from "$lib/components/ui/tooltip";
    import { copyToClipboard } from "$lib/utils/clipboard";
    import CopyIcon from "@lucide/svelte/icons/copy";
    import CheckIcon from "@lucide/svelte/icons/check";

    type Props = {
        name: string;
        color: string;
        description?: string;
    };

    let { name, color, description }: Props = $props();
    let copied = $state(false);

    function handleCopy() {
        copyToClipboard(color);
        copied = true;
        setTimeout(() => (copied = false), 2000);
    }
</script>

<Tooltip.Provider>
    <Tooltip.Root>
        <Tooltip.Trigger>
            <button onclick={handleCopy} class="w-full space-y-2 text-left group">
                <div
                    class="h-24 rounded-lg flex items-end p-3 transition-transform group-hover:scale-105"
                    style="background-color: {color}"
                >
                    <span class="text-white text-xs font-mono flex items-center gap-1">
                        {#if copied}
                            <CheckIcon class="h-3 w-3" />
                        {:else}
                            <CopyIcon class="h-3 w-3" />
                        {/if}
                        {color}
                    </span>
                </div>
                <p class="text-sm font-medium">{name}</p>
                {#if description}
                    <p class="text-xs text-muted-foreground">{description}</p>
                {/if}
            </button>
        </Tooltip.Trigger>
        <Tooltip.Content>
            <p>Click to copy {color}</p>
        </Tooltip.Content>
    </Tooltip.Root>
</Tooltip.Provider>
