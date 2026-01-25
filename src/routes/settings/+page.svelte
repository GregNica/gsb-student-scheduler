<script lang="ts">
    import * as Tabs from "$lib/components/ui/tabs";
    import { Toaster } from "$lib/components/ui/sonner";
    import UserIcon from "@lucide/svelte/icons/user";
    import PaletteIcon from "@lucide/svelte/icons/palette";
    import BellIcon from "@lucide/svelte/icons/bell";
    import ShieldIcon from "@lucide/svelte/icons/shield";

    import Profile from "./tabs/Profile.svelte";
    import Appearance from "./tabs/Appearance.svelte";
    import Notifications from "./tabs/Notifications.svelte";
    import Security from "./tabs/Security.svelte";
</script>

<Toaster />

<div class="space-y-6">
    <div>
        <h1 class="text-3xl font-bold">Settings</h1>
        <p class="text-muted-foreground">Manage your application preferences</p>
    </div>

    <Tabs.Root value="profile">
        <Tabs.List>
            <Tabs.Trigger value="profile" class="flex items-center gap-2">
                <UserIcon class="h-4 w-4" />
                Profile
            </Tabs.Trigger>
            <Tabs.Trigger value="appearance" class="flex items-center gap-2">
                <PaletteIcon class="h-4 w-4" />
                Appearance
            </Tabs.Trigger>
            <Tabs.Trigger value="notifications" class="flex items-center gap-2">
                <BellIcon class="h-4 w-4" />
                Notifications
            </Tabs.Trigger>
            <Tabs.Trigger value="security" class="flex items-center gap-2">
                <ShieldIcon class="h-4 w-4" />
                Security
            </Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="profile" class="mt-4">
            <Profile />
        </Tabs.Content>

        <Tabs.Content value="appearance" class="mt-4">
            <Appearance />
        </Tabs.Content>

        <Tabs.Content value="notifications" class="mt-4">
            <Notifications />
        </Tabs.Content>

        <Tabs.Content value="security" class="mt-4">
            <Security />
        </Tabs.Content>
    </Tabs.Root>
</div>
