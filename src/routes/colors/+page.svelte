<script lang="ts">
    import * as Tabs from "$lib/components/ui/tabs";
    import { Toaster } from "$lib/components/ui/sonner";

    import BrandColors from "./tabs/BrandColors.svelte";
    import ThemeVariables from "./tabs/ThemeVariables.svelte";
    import Typography from "./tabs/Typography.svelte";
    import FontAlternatives from "./tabs/FontAlternatives.svelte";
    import ColorGenerator from "./tabs/ColorGenerator.svelte";
</script>

<Toaster />

<div class="space-y-6">
    <div>
        <h1 class="text-3xl font-bold">Color Palette</h1>
        <p class="text-muted-foreground">
            Screen-friendly adaptation of SKKU brand colors by Frank Huettner
        </p>
    </div>

    <Tabs.Root value="brand">
        <Tabs.List>
            <Tabs.Trigger value="brand">Brand Colors</Tabs.Trigger>
            <Tabs.Trigger value="theme">Theme Variables</Tabs.Trigger>
            <Tabs.Trigger value="typography">Typography</Tabs.Trigger>
            <Tabs.Trigger value="fonts">Font Alternatives</Tabs.Trigger>
            <Tabs.Trigger value="generator">Color Generator</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="brand" class="mt-4">
            <BrandColors />
        </Tabs.Content>

        <Tabs.Content value="theme" class="mt-4">
            <ThemeVariables />
        </Tabs.Content>

        <Tabs.Content value="typography" class="mt-4">
            <Typography />
        </Tabs.Content>

        <Tabs.Content value="fonts" class="mt-4">
            <FontAlternatives />
        </Tabs.Content>

        <Tabs.Content value="generator" class="mt-4">
            <ColorGenerator />
        </Tabs.Content>
    </Tabs.Root>
</div>
