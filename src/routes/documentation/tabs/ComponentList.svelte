<script lang="ts">
    import { Badge } from "$lib/components/ui/badge";
    import { Button } from "$lib/components/ui/button";
    import * as Table from "$lib/components/ui/table";
    import * as ScrollArea from "$lib/components/ui/scroll-area";
    import { CardSection } from "$lib/components/sections";
    import ExternalLinkIcon from "@lucide/svelte/icons/external-link";

    const components = [
        { name: "Accordion", category: "Data Display", status: "stable" },
        { name: "Alert", category: "Feedback", status: "stable" },
        { name: "Alert Dialog", category: "Overlay", status: "stable" },
        { name: "Avatar", category: "Data Display", status: "stable" },
        { name: "Badge", category: "Data Display", status: "stable" },
        { name: "Button", category: "Actions", status: "stable" },
        { name: "Calendar", category: "Date", status: "stable" },
        { name: "Card", category: "Layout", status: "stable" },
        { name: "Checkbox", category: "Form", status: "stable" },
        { name: "Dialog", category: "Overlay", status: "stable" },
        { name: "Dropdown Menu", category: "Navigation", status: "stable" },
        { name: "Input", category: "Form", status: "stable" },
        { name: "Pagination", category: "Navigation", status: "stable" },
        { name: "Progress", category: "Feedback", status: "stable" },
        { name: "Select", category: "Form", status: "stable" },
        { name: "Sheet", category: "Overlay", status: "stable" },
        { name: "Sidebar", category: "Navigation", status: "stable" },
        { name: "Slider", category: "Form", status: "stable" },
        { name: "Switch", category: "Form", status: "stable" },
        { name: "Table", category: "Data Display", status: "stable" },
        { name: "Tabs", category: "Navigation", status: "stable" },
        { name: "Textarea", category: "Form", status: "stable" },
        { name: "Toast", category: "Feedback", status: "stable" },
        { name: "Tooltip", category: "Data Display", status: "stable" },
    ];
</script>

<CardSection title="All Components" description="Complete list of available UI components">
    <ScrollArea.Root class="h-[400px]">
        <Table.Root>
            <Table.Header>
                <Table.Row>
                    <Table.Head>Component</Table.Head>
                    <Table.Head>Category</Table.Head>
                    <Table.Head>Status</Table.Head>
                    <Table.Head class="text-right">Actions</Table.Head>
                </Table.Row>
            </Table.Header>
            <Table.Body>
                {#each components as comp}
                    <Table.Row>
                        <Table.Cell class="font-medium">{comp.name}</Table.Cell>
                        <Table.Cell>
                            <Badge variant="outline">{comp.category}</Badge>
                        </Table.Cell>
                        <Table.Cell>
                            <Badge class="bg-skku-light-green text-white dark:text-foreground">{comp.status}</Badge>
                        </Table.Cell>
                        <Table.Cell class="text-right">
                            <Button variant="ghost" size="sm">
                                <ExternalLinkIcon class="h-4 w-4" />
                            </Button>
                        </Table.Cell>
                    </Table.Row>
                {/each}
            </Table.Body>
        </Table.Root>
    </ScrollArea.Root>
</CardSection>
