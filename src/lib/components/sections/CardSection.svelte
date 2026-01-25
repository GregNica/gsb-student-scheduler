<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import type { Snippet } from "svelte";

    type Props = {
        title: string;
        description?: string;
        icon?: Snippet;
        children: Snippet;
        footer?: Snippet;
        class?: string;
    };

    let { title, description, icon, children, footer, class: className }: Props = $props();
</script>

<Card.Root class={className}>
    <Card.Header>
        <Card.Title class={icon ? "flex items-center gap-2" : ""}>
            {#if icon}
                {@render icon()}
            {/if}
            {title}
        </Card.Title>
        {#if description}
            <Card.Description>{description}</Card.Description>
        {/if}
    </Card.Header>
    <Card.Content>
        {@render children()}
    </Card.Content>
    {#if footer}
        <Card.Footer>
            {@render footer()}
        </Card.Footer>
    {/if}
</Card.Root>
