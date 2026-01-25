<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import * as ContextMenu from "$lib/components/ui/context-menu";
    import { CardSection } from "$lib/components/sections";
    import MenuIcon from "@lucide/svelte/icons/menu";
    import SettingsIcon from "@lucide/svelte/icons/settings";
    import UserIcon from "@lucide/svelte/icons/user";
    import MailIcon from "@lucide/svelte/icons/mail";
    import TrashIcon from "@lucide/svelte/icons/trash";
</script>

<div class="space-y-4">
    <CardSection title="Dropdown Menu" description="Accessible dropdown menus with keyboard navigation">
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <Button variant="outline">
                    <MenuIcon class="mr-2 h-4 w-4" />
                    Open Menu
                </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content class="w-56">
                <DropdownMenu.Label>My Account</DropdownMenu.Label>
                <DropdownMenu.Separator />
                <DropdownMenu.Group>
                    <DropdownMenu.Item>
                        <UserIcon class="mr-2 h-4 w-4" />
                        <span>Profile</span>
                        <DropdownMenu.Shortcut>⇧⌘P</DropdownMenu.Shortcut>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item>
                        <SettingsIcon class="mr-2 h-4 w-4" />
                        <span>Settings</span>
                        <DropdownMenu.Shortcut>⌘S</DropdownMenu.Shortcut>
                    </DropdownMenu.Item>
                </DropdownMenu.Group>
                <DropdownMenu.Separator />
                <DropdownMenu.Item>
                    <MailIcon class="mr-2 h-4 w-4" />
                    <span>Email</span>
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item class="text-destructive">
                    <TrashIcon class="mr-2 h-4 w-4" />
                    <span>Delete</span>
                    <DropdownMenu.Shortcut>⌘⌫</DropdownMenu.Shortcut>
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    </CardSection>

    <CardSection title="Context Menu" description="Right-click on the area below to see the context menu">
        <ContextMenu.Root>
            <ContextMenu.Trigger class="flex h-32 w-full items-center justify-center rounded-md border border-dashed text-sm">
                Right click here
            </ContextMenu.Trigger>
            <ContextMenu.Content class="w-64">
                <ContextMenu.Item>
                    Back
                    <ContextMenu.Shortcut>⌘[</ContextMenu.Shortcut>
                </ContextMenu.Item>
                <ContextMenu.Item disabled>
                    Forward
                    <ContextMenu.Shortcut>⌘]</ContextMenu.Shortcut>
                </ContextMenu.Item>
                <ContextMenu.Item>
                    Reload
                    <ContextMenu.Shortcut>⌘R</ContextMenu.Shortcut>
                </ContextMenu.Item>
                <ContextMenu.Separator />
                <ContextMenu.CheckboxItem checked>
                    Show Bookmarks Bar
                    <ContextMenu.Shortcut>⌘⇧B</ContextMenu.Shortcut>
                </ContextMenu.CheckboxItem>
                <ContextMenu.CheckboxItem>Show Full URLs</ContextMenu.CheckboxItem>
                <ContextMenu.Separator />
                <ContextMenu.Label>People</ContextMenu.Label>
                <ContextMenu.RadioGroup value="pedro">
                    <ContextMenu.RadioItem value="pedro">Pedro Duarte</ContextMenu.RadioItem>
                    <ContextMenu.RadioItem value="colm">Colm Tuite</ContextMenu.RadioItem>
                </ContextMenu.RadioGroup>
            </ContextMenu.Content>
        </ContextMenu.Root>
    </CardSection>
</div>
