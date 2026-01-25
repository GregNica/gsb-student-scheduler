<script lang="ts">
    import "../app.css";
    import AppSidebar from "$lib/components/sidebar/app-sidebar.svelte";
    import * as Breadcrumb from "$lib/components/ui/breadcrumb/index.js";
    import { Separator } from "$lib/components/ui/separator/index.js";
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import * as Command from "$lib/components/ui/command/index.js";
    import { page } from "$app/state";
    import { goto } from "$app/navigation";
    import { ModeWatcher } from "mode-watcher";
    import PaletteIcon from "@lucide/svelte/icons/palette";
    import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
    import ComponentIcon from "@lucide/svelte/icons/component";
    import SettingsIcon from "@lucide/svelte/icons/settings";
    import FileTextIcon from "@lucide/svelte/icons/file-text";
    import UploadIcon from "@lucide/svelte/icons/upload";
    import SettingsIconMain from "@lucide/svelte/icons/settings";

    let { children } = $props();

    let commandOpen = $state(false);

    const routeInfo: Record<string, { parent: string; name: string }> = {
        "/": { parent: "Home", name: "Dashboard" },
        "/setup": { parent: "App", name: "Course Setup" },
        "/upload": { parent: "App", name: "Upload Syllabus" },
        "/review": { parent: "App", name: "Review Assignments" },
        "/colors": { parent: "Design", name: "Colors" },
        "/components": { parent: "UI Library", name: "Components" },
        "/settings": { parent: "Preferences", name: "Settings" },
        "/documentation": { parent: "Resources", name: "Documentation" },
    };

    const commandItems = [
        { name: "Dashboard", href: "/", icon: LayoutDashboardIcon },
        { name: "Course Setup", href: "/setup", icon: SettingsIconMain },
        { name: "Upload Syllabus", href: "/upload", icon: UploadIcon },
        { name: "Colors", href: "/colors", icon: PaletteIcon },
        { name: "Components", href: "/components", icon: ComponentIcon },
        { name: "Settings", href: "/settings", icon: SettingsIcon },
        { name: "Documentation", href: "/documentation", icon: FileTextIcon },
    ];

    const currentRoute = $derived(
        routeInfo[page.url.pathname] || routeInfo["/"],
    );

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commandOpen = !commandOpen;
        }
    }

    function navigateTo(href: string) {
        commandOpen = false;
        goto(href);
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<ModeWatcher />

<Command.Dialog
    bind:open={commandOpen}
    title="Search"
    description="Search for pages and components"
>
    <Command.Input placeholder="Type to search..." />
    <Command.List>
        <Command.Empty>No results found.</Command.Empty>
        <Command.Group heading="Pages">
            {#each commandItems as item}
                <Command.Item onSelect={() => navigateTo(item.href)}>
                    <item.icon class="mr-2 h-4 w-4" />
                    {item.name}
                </Command.Item>
            {/each}
        </Command.Group>
    </Command.List>
</Command.Dialog>

<Sidebar.Provider>
    <AppSidebar />
    <Sidebar.Inset>
        <header class="flex h-16 shrink-0 items-center gap-2">
            <div class="flex items-center gap-2 px-4">
                <Sidebar.Trigger class="-ms-1" />
                <Separator
                    orientation="vertical"
                    class="me-2 data-[orientation=vertical]:h-4"
                />
                <Breadcrumb.Root>
                    <Breadcrumb.List>
                        <Breadcrumb.Item class="hidden md:block">
                            <Breadcrumb.Link href="/"
                                >{currentRoute.parent}</Breadcrumb.Link
                            >
                        </Breadcrumb.Item>
                        <Breadcrumb.Separator class="hidden md:block" />
                        <Breadcrumb.Item>
                            <Breadcrumb.Page
                                >{currentRoute.name}</Breadcrumb.Page
                            >
                        </Breadcrumb.Item>
                    </Breadcrumb.List>
                </Breadcrumb.Root>
            </div>
        </header>
        <div class="flex flex-1 flex-col gap-4 p-4 pt-0">
            {@render children()}
        </div>
    </Sidebar.Inset>
</Sidebar.Provider>
