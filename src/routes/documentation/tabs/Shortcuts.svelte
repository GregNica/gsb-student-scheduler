<script lang="ts">
    import { Kbd } from "$lib/components/ui/kbd";
    import * as Resizable from "$lib/components/ui/resizable";
    import { CardSection } from "$lib/components/sections";

    const shortcuts = [
        { keys: ["⌘", "K"], description: "Open command palette" },
        { keys: ["⌘", "B"], description: "Toggle sidebar" },
        { keys: ["⌘", "J"], description: "Toggle terminal" },
        { keys: ["⌘", "/"], description: "Toggle comment" },
        { keys: ["⌘", "S"], description: "Save file" },
        { keys: ["⌘", "⇧", "P"], description: "Open settings" },
    ];
</script>

<div class="space-y-4">
    <CardSection title="Keyboard Shortcuts" description="Quick reference for keyboard navigation">
        <div class="space-y-3">
            {#each shortcuts as shortcut}
                <div class="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span class="text-sm">{shortcut.description}</span>
                    <div class="flex items-center gap-1">
                        {#each shortcut.keys as key, i}
                            <Kbd>{key}</Kbd>
                            {#if i < shortcut.keys.length - 1}
                                <span class="text-muted-foreground">+</span>
                            {/if}
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    </CardSection>

    <CardSection title="Resizable Panels" description="Drag the handle to resize panels">
        <Resizable.PaneGroup direction="horizontal" class="min-h-[200px] rounded-lg border">
            <Resizable.Pane defaultSize={50}>
                <div class="flex h-full items-center justify-center p-6">
                    <span class="font-semibold">Panel One</span>
                </div>
            </Resizable.Pane>
            <Resizable.Handle withHandle />
            <Resizable.Pane defaultSize={50}>
                <div class="flex h-full items-center justify-center p-6">
                    <span class="font-semibold">Panel Two</span>
                </div>
            </Resizable.Pane>
        </Resizable.PaneGroup>
    </CardSection>
</div>
