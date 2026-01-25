<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import { Slider } from "$lib/components/ui/slider";
    import { CardSection } from "$lib/components/sections";
    import { copyToClipboard } from "$lib/utils/clipboard";
    import CopyIcon from "@lucide/svelte/icons/copy";
    import PaletteIcon from "@lucide/svelte/icons/palette";

    let hue = $state(216);
    let saturation = $state(87);
    let lightness = $state(20);

    const customColor = $derived(`hsl(${hue}, ${saturation}%, ${lightness}%)`);

    function reset() {
        hue = 216;
        saturation = 87;
        lightness = 20;
    }
</script>

<CardSection title="Custom Color Generator" description="Create custom colors using HSL sliders">
    {#snippet icon()}<PaletteIcon class="h-5 w-5" />{/snippet}

    <div class="space-y-6">
        <div
            class="h-32 rounded-lg flex items-center justify-center"
            style="background-color: {customColor}"
        >
            <span class="text-white font-mono text-lg drop-shadow-md">{customColor}</span>
        </div>

        <div class="space-y-4">
            <div class="space-y-2">
                <div class="flex justify-between">
                    <Label>Hue</Label>
                    <span class="text-sm text-muted-foreground">{hue}°</span>
                </div>
                <Slider type="single" bind:value={hue} max={360} step={1} />
            </div>

            <div class="space-y-2">
                <div class="flex justify-between">
                    <Label>Saturation</Label>
                    <span class="text-sm text-muted-foreground">{saturation}%</span>
                </div>
                <Slider type="single" bind:value={saturation} max={100} step={1} />
            </div>

            <div class="space-y-2">
                <div class="flex justify-between">
                    <Label>Lightness</Label>
                    <span class="text-sm text-muted-foreground">{lightness}%</span>
                </div>
                <Slider type="single" bind:value={lightness} max={100} step={1} />
            </div>
        </div>

        <div class="flex gap-2">
            <Button onclick={() => copyToClipboard(customColor)} class="flex-1">
                <CopyIcon class="h-4 w-4 mr-2" />
                Copy Color
            </Button>
            <Button variant="outline" onclick={reset}>Reset</Button>
        </div>
    </div>
</CardSection>
