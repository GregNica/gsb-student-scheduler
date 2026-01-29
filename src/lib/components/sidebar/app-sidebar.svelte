<script lang="ts" module>
    import LayoutDashboardIcon from "@lucide/svelte/icons/layout-dashboard";
    import PaletteIcon from "@lucide/svelte/icons/palette";
    import ComponentIcon from "@lucide/svelte/icons/component";
    import BookOpenIcon from "@lucide/svelte/icons/book-open";
    import SendIcon from "@lucide/svelte/icons/send";
    import Settings2Icon from "@lucide/svelte/icons/settings-2";
    import UploadIcon from "@lucide/svelte/icons/upload";
    import CalendarIcon from "@lucide/svelte/icons/calendar";
    import ClipboardCheckIcon from "@lucide/svelte/icons/clipboard-check";
    import SettingsIcon from "@lucide/svelte/icons/settings";
    import ArchiveIcon from "@lucide/svelte/icons/archive";
    import DownloadIcon from "@lucide/svelte/icons/download";

    const data = {
        user: {
            name: "SKKU User",
            email: "user@skku.edu",
            avatar: "",
        },
        navMain: [
            {
                title: "Dashboard",
                url: "/",
                icon: LayoutDashboardIcon,
                isActive: true,
            },
            {
                title: "Schedule Setup",
                url: "/setup",
                icon: CalendarIcon,
            },
            {
                title: "Review Schedule",
                url: "/schedule-review",
                icon: ClipboardCheckIcon,
            },
            {
                title: "Download Calendar",
                url: "/calendar-download",
                icon: DownloadIcon,
            },
            {
                title: "Upload Syllabus",
                url: "/upload",
                icon: UploadIcon,
            },
            {
                title: "Colors",
                url: "/colors",
                icon: PaletteIcon,
            },
            {
                title: "Components",
                url: "/components",
                icon: ComponentIcon,
            },
            {
                title: "Documentation",
                url: "/documentation",
                icon: BookOpenIcon,
            },
            {
                title: "Settings",
                url: "/settings",
                icon: Settings2Icon,
            },
            {
                title: "Course Setup (Legacy)",
                url: "/setup-legacy",
                icon: ArchiveIcon,
            },
        ],
        navSecondary: [
            {
                title: "Feedback",
                url: "mailto:huettner@skku.edu",
                icon: SendIcon,
            },
        ],
    };
</script>

<script lang="ts">
    import NavMain from "./nav-main.svelte";
    import NavSecondary from "./nav-secondary.svelte";
    import NavUser from "./nav-user.svelte";
    import * as Sidebar from "$lib/components/ui/sidebar/index.js";
    import CommandIcon from "@lucide/svelte/icons/command";
    import type { ComponentProps } from "svelte";

    let {
        ref = $bindable(null),
        ...restProps
    }: ComponentProps<typeof Sidebar.Root> = $props();
</script>

<Sidebar.Root bind:ref variant="inset" {...restProps}>
    <Sidebar.Header>
        <Sidebar.Menu>
            <Sidebar.MenuItem>
                <Sidebar.MenuButton size="lg">
                    {#snippet child({ props })}
                        <a href="/" {...props}>
                            <div
                                class="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg"
                            >
                                <CommandIcon class="size-4" />
                            </div>
                            <div
                                class="grid flex-1 text-start text-sm leading-tight"
                            >
                                <span class="truncate font-medium"
                                    >SKKU Colors</span
                                >
                                <span class="truncate text-xs"
                                    >Unofficial Demo</span
                                >
                            </div>
                        </a>
                    {/snippet}
                </Sidebar.MenuButton>
            </Sidebar.MenuItem>
        </Sidebar.Menu>
    </Sidebar.Header>
    <Sidebar.Content>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} class="mt-auto" />
    </Sidebar.Content>
    <Sidebar.Footer>
        <NavUser user={data.user} />
    </Sidebar.Footer>
</Sidebar.Root>
