<script lang="ts">
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Checkbox } from "$lib/components/ui/checkbox";
    import { Switch } from "$lib/components/ui/switch";
    import { Slider } from "$lib/components/ui/slider";
    import { Textarea } from "$lib/components/ui/textarea";
    import * as RadioGroup from "$lib/components/ui/radio-group";
    import { Separator } from "$lib/components/ui/separator";
    import { CardSection } from "$lib/components/sections";

    let sliderValue = $state(50);
</script>

<div class="space-y-4">
    <CardSection title="Text Inputs" description="Various input field types">
        <div class="space-y-4">
            <div class="grid gap-4 md:grid-cols-2">
                <div class="space-y-2">
                    <Label for="text">Text Input</Label>
                    <Input id="text" placeholder="Enter text..." />
                </div>
                <div class="space-y-2">
                    <Label for="email">Email Input</Label>
                    <Input id="email" type="email" placeholder="email@example.com" />
                </div>
                <div class="space-y-2">
                    <Label for="password">Password Input</Label>
                    <Input id="password" type="password" placeholder="Enter password..." />
                </div>
                <div class="space-y-2">
                    <Label for="disabled">Disabled Input</Label>
                    <Input id="disabled" disabled value="Disabled input" />
                </div>
            </div>
            <div class="space-y-2">
                <Label for="textarea">Textarea</Label>
                <Textarea id="textarea" placeholder="Enter long text here..." />
            </div>
        </div>
    </CardSection>

    <CardSection title="Selection Controls" description="Checkboxes, switches, radio buttons, and selects">
        <div class="space-y-6">
            <div class="space-y-4">
                <Label>Checkboxes</Label>
                <div class="flex flex-wrap gap-6">
                    <div class="flex items-center space-x-2">
                        <Checkbox id="terms" />
                        <Label for="terms">Accept terms</Label>
                    </div>
                    <div class="flex items-center space-x-2">
                        <Checkbox id="newsletter" checked />
                        <Label for="newsletter">Subscribe to newsletter</Label>
                    </div>
                </div>
            </div>
            <Separator />
            <div class="space-y-4">
                <Label>Switches</Label>
                <div class="flex flex-wrap gap-6">
                    <div class="flex items-center space-x-2">
                        <Switch id="notifications" />
                        <Label for="notifications">Enable notifications</Label>
                    </div>
                    <div class="flex items-center space-x-2">
                        <Switch id="marketing" checked />
                        <Label for="marketing">Marketing emails</Label>
                    </div>
                </div>
            </div>
            <Separator />
            <div class="space-y-4">
                <Label>Radio Group</Label>
                <RadioGroup.Root value="option-1">
                    <div class="flex items-center space-x-2">
                        <RadioGroup.Item value="option-1" id="option-1" />
                        <Label for="option-1">Option One</Label>
                    </div>
                    <div class="flex items-center space-x-2">
                        <RadioGroup.Item value="option-2" id="option-2" />
                        <Label for="option-2">Option Two</Label>
                    </div>
                    <div class="flex items-center space-x-2">
                        <RadioGroup.Item value="option-3" id="option-3" />
                        <Label for="option-3">Option Three</Label>
                    </div>
                </RadioGroup.Root>
            </div>
            <Separator />
            <div class="space-y-4 max-w-sm">
                <Label>Slider: {sliderValue}</Label>
                <Slider type="single" bind:value={sliderValue} max={100} step={1} />
            </div>
        </div>
    </CardSection>
</div>
