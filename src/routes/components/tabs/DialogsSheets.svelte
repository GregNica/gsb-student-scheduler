<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import * as Dialog from "$lib/components/ui/dialog";
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import * as Sheet from "$lib/components/ui/sheet";
    import * as Collapsible from "$lib/components/ui/collapsible";
    import { CardSection } from "$lib/components/sections";
    import { toast } from "svelte-sonner";
    import ChevronsUpDownIcon from "@lucide/svelte/icons/chevrons-up-down";

    let dialogOpen = $state(false);
    let sheetOpen = $state(false);
    let collapsibleOpen = $state(false);
</script>

<div class="space-y-4">
    <CardSection title="Dialog Components" description="Modal dialogs and side sheets">
        <div class="flex flex-wrap gap-3">
            <Dialog.Root bind:open={dialogOpen}>
                <Dialog.Trigger>
                    <Button>Open Dialog</Button>
                </Dialog.Trigger>
                <Dialog.Content>
                    <Dialog.Header>
                        <Dialog.Title>Dialog Title</Dialog.Title>
                        <Dialog.Description>
                            This is a dialog description. You can put any content here.
                        </Dialog.Description>
                    </Dialog.Header>
                    <div class="py-4">
                        <div class="space-y-2">
                            <Label for="dialog-name">Name</Label>
                            <Input id="dialog-name" placeholder="Enter your name" />
                        </div>
                    </div>
                    <Dialog.Footer>
                        <Button variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
                        <Button onclick={() => { dialogOpen = false; toast.success("Saved!"); }}>Save</Button>
                    </Dialog.Footer>
                </Dialog.Content>
            </Dialog.Root>

            <AlertDialog.Root>
                <AlertDialog.Trigger>
                    <Button variant="destructive">Delete Item</Button>
                </AlertDialog.Trigger>
                <AlertDialog.Content>
                    <AlertDialog.Header>
                        <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
                        <AlertDialog.Description>
                            This action cannot be undone. This will permanently delete the item from our servers.
                        </AlertDialog.Description>
                    </AlertDialog.Header>
                    <AlertDialog.Footer>
                        <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                        <AlertDialog.Action onclick={() => toast.error("Item deleted!")}>Delete</AlertDialog.Action>
                    </AlertDialog.Footer>
                </AlertDialog.Content>
            </AlertDialog.Root>

            <Sheet.Root bind:open={sheetOpen}>
                <Sheet.Trigger>
                    <Button variant="outline">Open Sheet</Button>
                </Sheet.Trigger>
                <Sheet.Content>
                    <Sheet.Header>
                        <Sheet.Title>Edit Profile</Sheet.Title>
                        <Sheet.Description>
                            Make changes to your profile here. Click save when you're done.
                        </Sheet.Description>
                    </Sheet.Header>
                    <div class="grid gap-4 py-4">
                        <div class="space-y-2">
                            <Label for="sheet-name">Name</Label>
                            <Input id="sheet-name" value="John Doe" />
                        </div>
                        <div class="space-y-2">
                            <Label for="sheet-email">Email</Label>
                            <Input id="sheet-email" value="john@example.com" />
                        </div>
                    </div>
                    <Sheet.Footer>
                        <Button onclick={() => { sheetOpen = false; toast.success("Profile saved!"); }}>
                            Save changes
                        </Button>
                    </Sheet.Footer>
                </Sheet.Content>
            </Sheet.Root>
        </div>
    </CardSection>

    <CardSection title="Collapsible" description="Expandable content sections">
        <Collapsible.Root bind:open={collapsibleOpen} class="w-full space-y-2">
            <div class="flex items-center justify-between space-x-4">
                <h4 class="text-sm font-semibold">@shadcn/svelte has 3 repositories</h4>
                <Collapsible.Trigger>
                    <Button variant="ghost" size="sm">
                        <ChevronsUpDownIcon class="h-4 w-4" />
                        <span class="sr-only">Toggle</span>
                    </Button>
                </Collapsible.Trigger>
            </div>
            <div class="rounded-md border px-4 py-2 text-sm">shadcn-svelte</div>
            <Collapsible.Content class="space-y-2">
                <div class="rounded-md border px-4 py-2 text-sm">bits-ui</div>
                <div class="rounded-md border px-4 py-2 text-sm">svelte-sonner</div>
            </Collapsible.Content>
        </Collapsible.Root>
    </CardSection>
</div>
