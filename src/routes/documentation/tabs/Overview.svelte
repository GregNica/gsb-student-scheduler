<script lang="ts">
    import { Badge } from "$lib/components/ui/badge";
    import * as Accordion from "$lib/components/ui/accordion";
    import * as Alert from "$lib/components/ui/alert";
    import { Kbd } from "$lib/components/ui/kbd";
    import { CardSection } from "$lib/components/sections";
    import LightbulbIcon from "@lucide/svelte/icons/lightbulb";
</script>

<div class="space-y-4">
    <Alert.Root>
        <LightbulbIcon class="h-4 w-4" />
        <Alert.Title>Tip</Alert.Title>
        <Alert.Description>
            Press <Kbd>⌘</Kbd> + <Kbd>K</Kbd> to quickly search components and documentation.
        </Alert.Description>
    </Alert.Root>

    <CardSection title="Frequently Asked Questions" description="Common questions about the design system">
        <Accordion.Root type="single" class="w-full">
            <Accordion.Item value="item-1">
                <Accordion.Trigger>What is this demo?</Accordion.Trigger>
                <Accordion.Content>
                    This is an unofficial color palette demo created by Frank Huettner. It showcases UI components built with Svelte 5 and Tailwind CSS v4, using SKKU's brand colors and Inter font (instead of Frutiger) adjusted to be more screen-friendly. This is not affiliated with or endorsed by Sungkyunkwan University.
                </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="item-2">
                <Accordion.Trigger>How many components are included?</Accordion.Trigger>
                <Accordion.Content>
                    <p class="mb-2">The system includes 47 components from shadcn-svelte:</p>
                    <div class="flex flex-wrap gap-1">
                        <Badge variant="outline">Accordion</Badge>
                        <Badge variant="outline">Alert</Badge>
                        <Badge variant="outline">Avatar</Badge>
                        <Badge variant="outline">Badge</Badge>
                        <Badge variant="outline">Button</Badge>
                        <Badge variant="outline">Card</Badge>
                        <Badge variant="outline">Dialog</Badge>
                        <Badge variant="outline">+40 more</Badge>
                    </div>
                </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="item-3">
                <Accordion.Trigger>How do I install a component?</Accordion.Trigger>
                <Accordion.Content>
                    <p class="mb-2">Use the shadcn-svelte CLI to add components:</p>
                    <div class="bg-muted p-3 rounded-lg font-mono text-sm">
                        pnpm dlx shadcn-svelte@latest add button
                    </div>
                </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="item-4">
                <Accordion.Trigger>Is this compatible with SvelteKit?</Accordion.Trigger>
                <Accordion.Content>
                    Yes! While this demo uses Vite with Svelte 5, all components are fully compatible with SvelteKit. The components use the same Svelte 5 runes syntax and can be directly copied to your project.
                </Accordion.Content>
            </Accordion.Item>
            <Accordion.Item value="item-5">
                <Accordion.Trigger>What are the SKKU brand colors?</Accordion.Trigger>
                <Accordion.Content>
                    <div class="flex gap-2 mt-2">
                        <Badge class="bg-skku-blue text-white">Blue #072B61</Badge>
                        <Badge class="bg-skku-orange text-white">Orange #FF6C0F</Badge>
                        <Badge class="bg-skku-light-green text-white dark:text-foreground">Green #8DC63F</Badge>
                        <Badge class="bg-skku-dark-green text-white">Dark #124633</Badge>
                    </div>
                </Accordion.Content>
            </Accordion.Item>
        </Accordion.Root>
    </CardSection>
</div>
