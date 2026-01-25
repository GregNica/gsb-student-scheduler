<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Popover from "$lib/components/ui/popover";
    import { CardSection } from "$lib/components/sections";
    import { copyToClipboard } from "$lib/utils/clipboard";
    import CopyIcon from "@lucide/svelte/icons/copy";

    const themeColors = [
        { name: "Background", hsl: "hsl(35, 25%, 98%)", token: "--background" },
        { name: "Foreground", hsl: "hsl(0, 0%, 5%)", token: "--foreground" },
        { name: "Primary", hsl: "hsl(216, 87%, 20%)", token: "--primary" },
        { name: "Secondary", hsl: "hsl(23, 100%, 92%)", token: "--secondary" },
        { name: "Accent", hsl: "hsl(23, 100%, 95%)", token: "--accent" },
        { name: "Muted", hsl: "hsl(35, 20%, 92%)", token: "--muted" },
        { name: "Destructive", hsl: "hsl(12, 90%, 55%)", token: "--destructive" },
    ];
</script>

<CardSection
    title="CSS Theme Variables"
    description="HSL values used in the design system"
>
    <div class="grid gap-3">
        {#each themeColors as color}
            <div class="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                <div
                    class="w-10 h-10 rounded-md border"
                    style="background-color: {color.hsl}"
                ></div>
                <div class="flex-1">
                    <p class="font-medium">{color.name}</p>
                    <p class="text-xs text-muted-foreground font-mono">{color.token}</p>
                </div>
                <Popover.Root>
                    <Popover.Trigger>
                        <Button variant="ghost" size="sm">
                            <CopyIcon class="h-4 w-4" />
                        </Button>
                    </Popover.Trigger>
                    <Popover.Content class="w-80">
                        <div class="space-y-2">
                            <h4 class="font-medium">{color.name}</h4>
                            <div class="grid gap-2">
                                <div class="grid grid-cols-3 items-center gap-4">
                                    <Label>HSL</Label>
                                    <Input value={color.hsl} class="col-span-2 h-8" readonly />
                                </div>
                                <div class="grid grid-cols-3 items-center gap-4">
                                    <Label>Token</Label>
                                    <Input value={color.token} class="col-span-2 h-8" readonly />
                                </div>
                            </div>
                            <Button size="sm" class="w-full" onclick={() => copyToClipboard(color.hsl)}>
                                Copy HSL Value
                            </Button>
                        </div>
                    </Popover.Content>
                </Popover.Root>
            </div>
        {/each}
    </div>
</CardSection>
