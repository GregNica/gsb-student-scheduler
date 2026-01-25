<script lang="ts">
    import { Badge } from "$lib/components/ui/badge";
    import { Button } from "$lib/components/ui/button";
    import { Label } from "$lib/components/ui/label";
    import { Separator } from "$lib/components/ui/separator";
    import { CardSection, ColorSwatch } from "$lib/components/sections";

    const brandColors = [
        { name: "SKKU Blue", color: "#072B61", description: "Primary brand color" },
        { name: "SKKU Orange", color: "#FF6C0F", description: "Accent color" },
        { name: "Light Green", color: "#8DC63F", description: "Natural Science" },
        { name: "Dark Green", color: "#124633", description: "Humanities" },
    ];
</script>

<div class="space-y-6">
    <CardSection
        title="SKKU Brand Colors"
        description="Click on any color to copy its hex value"
    >
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            {#each brandColors as color}
                <ColorSwatch name={color.name} color={color.color} description={color.description} />
            {/each}
        </div>
    </CardSection>

    <CardSection
        title="Color Applications"
        description="Examples of brand colors in UI components"
    >
        <div class="space-y-4">
            <div>
                <Label class="mb-2 block">Buttons</Label>
                <div class="flex flex-wrap gap-2">
                    <Button class="bg-skku-blue hover:bg-skku-blue/90 text-white">SKKU Blue</Button>
                    <Button class="bg-skku-orange hover:bg-skku-orange/90">SKKU Orange</Button>
                    <Button class="bg-skku-light-green hover:bg-skku-light-green/90 text-white dark:text-foreground">Light Green</Button>
                    <Button class="bg-skku-dark-green hover:bg-skku-dark-green/90 text-white">Dark Green</Button>
                    <Button>Default</Button>
                </div>
            </div>
            <Separator />
            <div>
                <Label class="mb-2 block">Badges</Label>
                <div class="flex flex-wrap gap-2">
                    <Badge class="bg-skku-blue text-white">Blue</Badge>
                    <Badge class="bg-skku-orange text-white">Orange</Badge>
                    <Badge class="bg-skku-light-green text-white dark:text-foreground">Light Green</Badge>
                    <Badge class="bg-skku-dark-green text-white">Dark Green</Badge>
                    <Badge>Default</Badge>
                </div>
            </div>
            <Separator />
            <div>
                <Label class="mb-2 block">Outline Variants</Label>
                <div class="flex flex-wrap gap-2">
                    <Button variant="outline" class="border-skku-blue text-skku-blue dark:border-white dark:text-white">Blue</Button>
                    <Button variant="outline" class="border-skku-orange text-skku-orange">Orange</Button>
                    <Badge variant="outline" class="border-skku-light-green text-skku-light-green">Light Green</Badge>
                    <Badge variant="outline" class="border-skku-dark-green text-skku-dark-green dark:border-skku-light-green dark:text-skku-light-green">Dark Green</Badge>
                    <Button variant="outline">Default</Button>
                    <Badge variant="outline">Default</Badge>
                </div>
            </div>
        </div>
    </CardSection>
</div>
