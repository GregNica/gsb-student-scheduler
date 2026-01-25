<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import { Badge } from "$lib/components/ui/badge";
    import { Button } from "$lib/components/ui/button";
    import { Progress } from "$lib/components/ui/progress";
    import * as Avatar from "$lib/components/ui/avatar";
    import * as HoverCard from "$lib/components/ui/hover-card";
    import { Skeleton } from "$lib/components/ui/skeleton";
    import * as Alert from "$lib/components/ui/alert";
    import * as Table from "$lib/components/ui/table";
    import { Separator } from "$lib/components/ui/separator";
    import InfoIcon from "@lucide/svelte/icons/info";
    import TrendingUpIcon from "@lucide/svelte/icons/trending-up";
    import UsersIcon from "@lucide/svelte/icons/users";
    import ActivityIcon from "@lucide/svelte/icons/activity";
    import CalendarIcon from "@lucide/svelte/icons/calendar";

    const recentActivity = [
        {
            user: "Kim",
            action: "Created new project",
            time: "2 min ago",
            avatar: "K",
        },
        {
            user: "Park",
            action: "Updated color palette",
            time: "5 min ago",
            avatar: "P",
        },
        {
            user: "Lee",
            action: "Added component",
            time: "12 min ago",
            avatar: "L",
        },
        {
            user: "Choi",
            action: "Published docs",
            time: "1 hour ago",
            avatar: "C",
        },
    ];

    const stats = [
        {
            label: "Total Users",
            value: "2,847",
            change: "+12%",
            icon: UsersIcon,
        },
        {
            label: "Active Sessions",
            value: "1,234",
            change: "+8%",
            icon: ActivityIcon,
        },
        {
            label: "Components",
            value: "47",
            change: "100%",
            icon: TrendingUpIcon,
        },
        {
            label: "Uptime",
            value: "99.9%",
            change: "Stable",
            icon: CalendarIcon,
        },
    ];
</script>

<div class="space-y-6">
    <div class="flex items-center justify-between">
        <div>
            <h1 class="text-3xl font-bold">Dashboard</h1>
            <p class="text-muted-foreground">
                Welcome to your SKKU Design System dashboard
            </p>
        </div>
        <div class="flex gap-2">
            <Button variant="outline">Export</Button>
            <Button>New Project</Button>
        </div>
    </div>

    <!-- Alert -->
    <Alert.Root>
        <InfoIcon class="h-4 w-4" />
        <Alert.Title>Welcome to the SKKU Color Palette Demo</Alert.Title>
        <Alert.Description>
            This is not an official SKKU design system. The color palette and
            font (Inter instead of Frutiger) have been adjusted by Frank
            Huettner to be more screen-friendly while staying true to the SKKU
            brand colors.
        </Alert.Description>
    </Alert.Root>

    <!-- Stats Grid with HoverCard -->
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {#each stats as stat}
            <HoverCard.Root>
                <HoverCard.Trigger>
                    <Card.Root
                        class="cursor-pointer hover:border-primary/50 transition-colors"
                    >
                        <Card.Header
                            class="flex flex-row items-center justify-between space-y-0 pb-2"
                        >
                            <Card.Title class="text-sm font-medium"
                                >{stat.label}</Card.Title
                            >
                            <stat.icon class="h-4 w-4 text-muted-foreground" />
                        </Card.Header>
                        <Card.Content>
                            <div class="text-2xl font-bold">{stat.value}</div>
                            <p class="text-xs text-muted-foreground">
                                <span class="text-skku-orange"
                                    >{stat.change}</span
                                > from last month
                            </p>
                        </Card.Content>
                    </Card.Root>
                </HoverCard.Trigger>
                <HoverCard.Content class="w-80">
                    <div class="flex justify-between space-x-4">
                        <div class="space-y-1">
                            <h4 class="text-sm font-semibold">
                                {stat.label} Details
                            </h4>
                            <p class="text-sm text-muted-foreground">
                                Hover cards provide additional context without
                                cluttering the UI.
                            </p>
                            <div class="flex items-center pt-2">
                                <CalendarIcon class="mr-2 h-4 w-4 opacity-70" />
                                <span class="text-xs text-muted-foreground"
                                    >Updated just now</span
                                >
                            </div>
                        </div>
                    </div>
                </HoverCard.Content>
            </HoverCard.Root>
        {/each}
    </div>

    <div class="grid gap-6 md:grid-cols-2">
        <!-- Progress Section -->
        <Card.Root>
            <Card.Header>
                <Card.Title>Project Progress</Card.Title>
                <Card.Description
                    >Design system implementation status</Card.Description
                >
            </Card.Header>
            <Card.Content class="space-y-4">
                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span>Components</span>
                        <span class="text-muted-foreground">100%</span>
                    </div>
                    <Progress value={100} />
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span>Documentation</span>
                        <span class="text-muted-foreground">65%</span>
                    </div>
                    <Progress value={65} />
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span>Testing</span>
                        <span class="text-muted-foreground">40%</span>
                    </div>
                    <Progress value={40} />
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between text-sm">
                        <span>Deployment</span>
                        <span class="text-muted-foreground">20%</span>
                    </div>
                    <Progress value={20} />
                </div>
            </Card.Content>
        </Card.Root>

        <!-- Recent Activity with Avatar -->
        <Card.Root>
            <Card.Header>
                <Card.Title>Recent Activity</Card.Title>
                <Card.Description
                    >Latest updates from team members</Card.Description
                >
            </Card.Header>
            <Card.Content>
                <div class="space-y-4">
                    {#each recentActivity as activity}
                        <div class="flex items-center gap-4">
                            <Avatar.Root>
                                <Avatar.Fallback
                                    class="bg-primary text-primary-foreground"
                                    >{activity.avatar}</Avatar.Fallback
                                >
                            </Avatar.Root>
                            <div class="flex-1 space-y-1">
                                <p class="text-sm font-medium leading-none">
                                    {activity.user}
                                </p>
                                <p class="text-sm text-muted-foreground">
                                    {activity.action}
                                </p>
                            </div>
                            <Badge variant="outline">{activity.time}</Badge>
                        </div>
                        {#if activity !== recentActivity[recentActivity.length - 1]}
                            <Separator />
                        {/if}
                    {/each}
                </div>
            </Card.Content>
        </Card.Root>
    </div>

    <!-- Table -->
    <Card.Root>
        <Card.Header>
            <Card.Title>Component Overview</Card.Title>
            <Card.Description
                >Status of installed shadcn-svelte components</Card.Description
            >
        </Card.Header>
        <Card.Content>
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.Head>Component</Table.Head>
                        <Table.Head>Category</Table.Head>
                        <Table.Head>Status</Table.Head>
                        <Table.Head class="text-right">Usage</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    <Table.Row>
                        <Table.Cell class="font-medium">Button</Table.Cell>
                        <Table.Cell>Actions</Table.Cell>
                        <Table.Cell
                            ><Badge class="bg-skku-light-green">Active</Badge
                            ></Table.Cell
                        >
                        <Table.Cell class="text-right">High</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                        <Table.Cell class="font-medium">Card</Table.Cell>
                        <Table.Cell>Layout</Table.Cell>
                        <Table.Cell
                            ><Badge class="bg-skku-light-green">Active</Badge
                            ></Table.Cell
                        >
                        <Table.Cell class="text-right">High</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                        <Table.Cell class="font-medium">Dialog</Table.Cell>
                        <Table.Cell>Overlay</Table.Cell>
                        <Table.Cell
                            ><Badge class="bg-skku-light-green">Active</Badge
                            ></Table.Cell
                        >
                        <Table.Cell class="text-right">Medium</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                        <Table.Cell class="font-medium">Sidebar</Table.Cell>
                        <Table.Cell>Navigation</Table.Cell>
                        <Table.Cell
                            ><Badge class="bg-skku-light-green">Active</Badge
                            ></Table.Cell
                        >
                        <Table.Cell class="text-right">High</Table.Cell>
                    </Table.Row>
                    <Table.Row>
                        <Table.Cell class="font-medium">Chart</Table.Cell>
                        <Table.Cell>Data</Table.Cell>
                        <Table.Cell
                            ><Badge variant="outline">Pending</Badge
                            ></Table.Cell
                        >
                        <Table.Cell class="text-right">Low</Table.Cell>
                    </Table.Row>
                </Table.Body>
            </Table.Root>
        </Card.Content>
    </Card.Root>

    <!-- Skeleton Loading Example -->
    <Card.Root>
        <Card.Header>
            <Card.Title>Loading States</Card.Title>
            <Card.Description
                >Skeleton components for loading placeholders</Card.Description
            >
        </Card.Header>
        <Card.Content>
            <div class="flex items-center space-x-4">
                <Skeleton class="h-12 w-12 rounded-full" />
                <div class="space-y-2">
                    <Skeleton class="h-4 w-50" />
                    <Skeleton class="h-4 w-50" />
                </div>
            </div>
        </Card.Content>
    </Card.Root>
</div>
