<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Badge } from "$lib/components/ui/badge";
    import { Separator } from "$lib/components/ui/separator";
    import { Kbd } from "$lib/components/ui/kbd";
    import { CardSection } from "$lib/components/sections";
    import { toast } from "svelte-sonner";
    import MailIcon from "@lucide/svelte/icons/mail";
    import PlusIcon from "@lucide/svelte/icons/plus";
</script>

<div class="space-y-4">
    <CardSection title="Button Variants" description="Different button styles for various use cases">
        <div class="space-y-4">
            <div class="flex flex-wrap gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="destructive">Destructive</Button>
            </div>
            <Separator />
            <div class="flex flex-wrap gap-3">
                <Button size="sm">Small</Button>
                <Button size="default">Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon"><PlusIcon class="h-4 w-4" /></Button>
            </div>
            <Separator />
            <div class="flex flex-wrap gap-3">
                <Button disabled>Disabled</Button>
                <Button>
                    <MailIcon class="mr-2 h-4 w-4" />
                    With Icon
                </Button>
                <Button onclick={() => toast.success("Button clicked!")}>Show Toast</Button>
            </div>
        </div>
    </CardSection>

    <CardSection title="Badges & Keyboard" description="Status indicators and keyboard shortcuts">
        <div class="space-y-4">
            <div class="flex flex-wrap gap-3">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
            </div>
            <Separator />
            <div class="flex flex-wrap items-center gap-3">
                <span class="text-sm">Keyboard shortcuts:</span>
                <Kbd>Ctrl</Kbd>
                <span>+</span>
                <Kbd>K</Kbd>
                <span class="text-muted-foreground mx-2">or</span>
                <Kbd>⌘</Kbd>
                <span>+</span>
                <Kbd>K</Kbd>
            </div>
        </div>
    </CardSection>
</div>
