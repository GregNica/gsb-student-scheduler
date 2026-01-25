<script lang="ts">
    import * as Tabs from "$lib/components/ui/tabs";
    import { Toaster } from "$lib/components/ui/sonner";

    import ButtonsActions from "./tabs/ButtonsActions.svelte";
    import FormInputs from "./tabs/FormInputs.svelte";
    import DialogsSheets from "./tabs/DialogsSheets.svelte";
    import MenusDropdowns from "./tabs/MenusDropdowns.svelte";
    import Miscellaneous from "./tabs/Miscellaneous.svelte";
</script>

<Toaster />

<div class="space-y-6">
    <div>
        <h1 class="text-3xl font-bold">Components</h1>
        <p class="text-muted-foreground">
            Browse and test UI components from shadcn-svelte
        </p>
    </div>

    <Tabs.Root value="buttons">
        <Tabs.List class="flex-wrap">
            <Tabs.Trigger value="buttons">Buttons & Actions</Tabs.Trigger>
            <Tabs.Trigger value="inputs">Form Inputs</Tabs.Trigger>
            <Tabs.Trigger value="overlays">Dialogs & Sheets</Tabs.Trigger>
            <Tabs.Trigger value="menus">Menus & Dropdowns</Tabs.Trigger>
            <Tabs.Trigger value="misc">Miscellaneous</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="buttons" class="mt-4">
            <ButtonsActions />
        </Tabs.Content>

        <Tabs.Content value="inputs" class="mt-4">
            <FormInputs />
        </Tabs.Content>

        <Tabs.Content value="overlays" class="mt-4">
            <DialogsSheets />
        </Tabs.Content>

        <Tabs.Content value="menus" class="mt-4">
            <MenusDropdowns />
        </Tabs.Content>

        <Tabs.Content value="misc" class="mt-4">
            <Miscellaneous />
        </Tabs.Content>
    </Tabs.Root>
</div>
