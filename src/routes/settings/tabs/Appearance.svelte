<script lang="ts">
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";
    import { Separator } from "$lib/components/ui/separator";
    import { Badge } from "$lib/components/ui/badge";
    import { Slider } from "$lib/components/ui/slider";
    import * as RadioGroup from "$lib/components/ui/radio-group";
    import { CardSection, SettingRow } from "$lib/components/sections";

    let fontSize = $state(16);
</script>

<CardSection title="Theme" description="Customize the look and feel of the application">
    <div class="space-y-6">
        <div class="space-y-4">
            <Label>Color Theme</Label>
            <RadioGroup.Root value="light" class="grid grid-cols-3 gap-4">
                <Label
                    for="light"
                    class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                    <RadioGroup.Item value="light" id="light" class="sr-only" />
                    <div class="mb-3 h-10 w-10 rounded-full bg-[#fafaf9] border"></div>
                    <span class="text-sm font-medium">Light</span>
                </Label>
                <Label
                    for="dark"
                    class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                    <RadioGroup.Item value="dark" id="dark" class="sr-only" />
                    <div class="mb-3 h-10 w-10 rounded-full bg-[#1a1a1a] border"></div>
                    <span class="text-sm font-medium">Dark</span>
                </Label>
                <Label
                    for="system"
                    class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                    <RadioGroup.Item value="system" id="system" class="sr-only" />
                    <div class="mb-3 h-10 w-10 rounded-full bg-gradient-to-r from-[#fafaf9] to-[#1a1a1a] border"></div>
                    <span class="text-sm font-medium">System</span>
                </Label>
            </RadioGroup.Root>
        </div>
        <Separator />
        <div class="space-y-4">
            <div class="flex justify-between items-center">
                <Label>Font Size: {fontSize}px</Label>
                <Badge variant="outline">{fontSize}px</Badge>
            </div>
            <Slider type="single" bind:value={fontSize} min={12} max={24} step={1} />
            <p class="text-sm text-muted-foreground" style="font-size: {fontSize}px">
                Preview text at {fontSize}px
            </p>
        </div>
        <Separator />
        <div class="space-y-4">
            <Label>Display Options</Label>
            <div class="space-y-3">
                <SettingRow label="Reduce Motion" description="Minimize animations">
                    <Switch />
                </SettingRow>
                <SettingRow label="Compact Mode" description="Reduce spacing">
                    <Switch />
                </SettingRow>
                <SettingRow label="Show Tooltips" description="Display helpful hints">
                    <Switch checked />
                </SettingRow>
            </div>
        </div>
    </div>
</CardSection>
