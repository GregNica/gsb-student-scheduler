<script lang="ts">
    import { Badge } from "$lib/components/ui/badge";
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import { Separator } from "$lib/components/ui/separator";
    import { CardSection, CopyableValue } from "$lib/components/sections";
    import TypeIcon from "@lucide/svelte/icons/type";

    type Font = {
        name: string;
        family: string;
        description: string;
        google: string;
    };

    const alternativeFonts: Font[] = [
        { name: "Inter", family: "'Inter', sans-serif", description: "Current choice - designed for screens, highly legible at small sizes", google: "Inter:wght@400;500;600;700" },
        { name: "Hind", family: "'Hind', sans-serif", description: "Humanist sans-serif similar to Frutiger", google: "Hind:wght@400;500;600;700" },
        { name: "Source Sans 3", family: "'Source Sans 3', sans-serif", description: "Adobe's open-source humanist font, excellent readability", google: "Source+Sans+3:wght@400;500;600;700" },
        { name: "Open Sans", family: "'Open Sans', sans-serif", description: "Highly legible, neutral and friendly appearance", google: "Open+Sans:wght@400;500;600;700" },
        { name: "Nunito Sans", family: "'Nunito Sans', sans-serif", description: "Well-balanced with rounded terminals, modern feel", google: "Nunito+Sans:wght@400;500;600;700" },
        { name: "Lato", family: "'Lato', sans-serif", description: "Semi-rounded details with strong structure", google: "Lato:wght@400;700" },
        { name: "PT Sans", family: "'PT Sans', sans-serif", description: "Based on Russian sans-serifs, universal and distinctive", google: "PT+Sans:wght@400;700" },
        { name: "Noto Sans", family: "'Noto Sans', sans-serif", description: "Google's universal font with excellent language support", google: "Noto+Sans:wght@400;500;600;700" },
    ];

    let selectedFont = $state(alternativeFonts[0]);

    function applyFont(font: Font) {
        selectedFont = font;
        document.documentElement.style.setProperty("--font-sans", font.family);
    }

    function getGoogleFontsUrl(font: Font): string {
        return `https://fonts.googleapis.com/css2?family=${font.google}&display=swap`;
    }
</script>

<svelte:head>
    {#each alternativeFonts as font}
        <link href={getGoogleFontsUrl(font)} rel="stylesheet" />
    {/each}
</svelte:head>

<div class="space-y-6">
    <CardSection title="Font Alternatives" description="Compare different fonts that could work as Frutiger alternatives">
        {#snippet icon()}<TypeIcon class="h-5 w-5" />{/snippet}

        <div class="grid gap-3">
            {#each alternativeFonts as font}
                <button
                    onclick={() => applyFont(font)}
                    class="flex items-center gap-4 p-4 rounded-lg border text-left transition-colors {selectedFont.name === font.name ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}"
                >
                    <div class="flex-1">
                        <p class="text-lg" style="font-family: {font.family}">{font.name}</p>
                        <p class="text-sm text-muted-foreground">{font.description}</p>
                    </div>
                    {#if selectedFont.name === font.name}
                        <Badge>Selected</Badge>
                    {/if}
                </button>
            {/each}
        </div>
    </CardSection>

    <CardSection title="Preview: {selectedFont.name}" description="See how the selected font looks in different contexts">
        {#snippet footer()}
            <div class="flex-col items-start gap-2 w-full">
                <Label class="text-muted-foreground">Google Fonts Import</Label>
                <CopyableValue value={getGoogleFontsUrl(selectedFont)} class="w-full mt-2" />
            </div>
        {/snippet}

        <div class="space-y-6" style="font-family: {selectedFont.family}">
            <div>
                <Label class="mb-2 block text-muted-foreground">Headings</Label>
                <h1 class="text-3xl font-bold mb-2">SKKU Design System</h1>
                <h2 class="text-2xl font-semibold mb-2">Color Palette & Typography</h2>
                <h3 class="text-xl font-medium">Component Library</h3>
            </div>
            <Separator />
            <div>
                <Label class="mb-2 block text-muted-foreground">Body Text</Label>
                <p class="mb-2">
                    Sungkyunkwan University (SKKU) is one of the oldest and most prestigious universities in South Korea, founded in 1398. The university maintains two campuses: the Humanities and Social Sciences Campus in Seoul and the Natural Sciences Campus in Suwon.
                </p>
                <p class="text-sm text-muted-foreground">
                    This is secondary text that might appear in descriptions, captions, or helper text throughout the interface.
                </p>
            </div>
            <Separator />
            <div>
                <Label class="mb-2 block text-muted-foreground">Korean Text</Label>
                <p class="text-lg mb-2">성균관대학교는 1398년에 설립된 대한민국의 명문 사립대학교입니다.</p>
                <p class="text-sm text-muted-foreground">인문사회과학캠퍼스와 자연과학캠퍼스 두 개의 캠퍼스를 운영하고 있습니다.</p>
            </div>
            <Separator />
            <div>
                <Label class="mb-2 block text-muted-foreground">UI Elements</Label>
                <div class="flex flex-wrap gap-2">
                    <Button>Primary Button</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Badge>Badge</Badge>
                    <Badge variant="secondary">Secondary Badge</Badge>
                </div>
            </div>
            <Separator />
            <div>
                <Label class="mb-2 block text-muted-foreground">Character Set</Label>
                <p class="text-xl mb-1">ABCDEFGHIJKLMNOPQRSTUVWXYZ</p>
                <p class="text-xl mb-1">abcdefghijklmnopqrstuvwxyz</p>
                <p class="text-xl">0123456789 !@#$%^&*()</p>
            </div>
        </div>
    </CardSection>
</div>
