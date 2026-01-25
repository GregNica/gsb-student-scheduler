<script lang="ts">
    import * as Collapsible from "$lib/components/ui/collapsible/index.js";
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";

    let {
        items,
    }: {
        items: {
            title: string;
            url: string;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            icon: any;
            isActive?: boolean;
            items?: {
                title: string;
                url: string;
            }[];
        }[];
    } = $props();
</script>

<Sidebar.Group>
    <Sidebar.GroupLabel>Platform</Sidebar.GroupLabel>
    <Sidebar.Menu>
        {#each items as mainItem (mainItem.title)}
            {#if mainItem.items?.length}
                <Collapsible.Root open={mainItem.isActive}>
                    {#snippet child({ props })}
                        <Sidebar.MenuItem {...props}>
                            <Sidebar.MenuButton tooltipContent={mainItem.title}>
                                {#snippet child({ props })}
                                    <a href={mainItem.url} {...props}>
                                        <mainItem.icon />
                                        <span>{mainItem.title}</span>
                                    </a>
                                {/snippet}
                            </Sidebar.MenuButton>
                            <Collapsible.Trigger>
                                {#snippet child({ props })}
                                    <Sidebar.MenuAction
                                        {...props}
                                        class="data-[state=open]:rotate-90"
                                    >
                                        <ChevronRightIcon />
                                        <span class="sr-only">Toggle</span>
                                    </Sidebar.MenuAction>
                                {/snippet}
                            </Collapsible.Trigger>
                            <Collapsible.Content>
                                <Sidebar.MenuSub>
                                    {#each mainItem.items as subItem (subItem.title)}
                                        <Sidebar.MenuSubItem>
                                            <Sidebar.MenuSubButton>
                                                {#snippet child({ props })}
                                                    <a
                                                        href={subItem.url}
                                                        {...props}
                                                    >
                                                        <span
                                                            >{subItem.title}</span
                                                        >
                                                    </a>
                                                {/snippet}
                                            </Sidebar.MenuSubButton>
                                        </Sidebar.MenuSubItem>
                                    {/each}
                                </Sidebar.MenuSub>
                            </Collapsible.Content>
                        </Sidebar.MenuItem>
                    {/snippet}
                </Collapsible.Root>
            {:else}
                <Sidebar.MenuItem>
                    <Sidebar.MenuButton tooltipContent={mainItem.title}>
                        {#snippet child({ props })}
                            <a href={mainItem.url} {...props}>
                                <mainItem.icon />
                                <span>{mainItem.title}</span>
                            </a>
                        {/snippet}
                    </Sidebar.MenuButton>
                </Sidebar.MenuItem>
            {/if}
        {/each}
    </Sidebar.Menu>
</Sidebar.Group>
