<script lang="ts">
    import * as Tabs from "$lib/components/ui/tabs";
    import { Input } from "$lib/components/ui/input";
    import { Toaster } from "$lib/components/ui/sonner";
    import SearchIcon from "@lucide/svelte/icons/search";

    import QuickLinks from "./QuickLinks.svelte";
    import Overview from "./tabs/Overview.svelte";
    import ComponentList from "./tabs/ComponentList.svelte";
    import CodeExamples from "./tabs/CodeExamples.svelte";
    import Shortcuts from "./tabs/Shortcuts.svelte";
</script>

<Toaster />

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-3xl font-bold">Documentation</h1>
            <p class="text-muted-foreground">
                Learn about this unofficial SKKU color palette demo
            </p>
        </div>
        <div class="relative w-64">
            <SearchIcon
                class="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"
            />
            <Input placeholder="Search docs..." class="pl-8" />
        </div>
    </div>

    <QuickLinks />

    <Tabs.Root value="overview">
        <Tabs.List>
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            <Tabs.Trigger value="components">Component List</Tabs.Trigger>
            <Tabs.Trigger value="examples">Code Examples</Tabs.Trigger>
            <Tabs.Trigger value="shortcuts">Shortcuts</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="overview" class="mt-4">
            <Overview />
        </Tabs.Content>

        <Tabs.Content value="components" class="mt-4">
            <ComponentList />
        </Tabs.Content>

        <Tabs.Content value="examples" class="mt-4">
            <CodeExamples />
        </Tabs.Content>

        <Tabs.Content value="shortcuts" class="mt-4">
            <Shortcuts />
        </Tabs.Content>
    </Tabs.Root>
</div>
