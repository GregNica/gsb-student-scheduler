<script lang="ts">
    import * as Card from "$lib/components/ui/card";
    import RocketIcon from "@lucide/svelte/icons/rocket";
    import CodeIcon from "@lucide/svelte/icons/code";
    import BookOpenIcon from "@lucide/svelte/icons/book-open";
    import LightbulbIcon from "@lucide/svelte/icons/lightbulb";

    const links = [
        { icon: RocketIcon, title: "Getting Started", description: "Quick setup guide for new projects" },
        { icon: CodeIcon, title: "Components", description: "Browse 47 UI components" },
        { icon: BookOpenIcon, title: "Guides", description: "In-depth tutorials and examples" },
        { icon: LightbulbIcon, title: "Best Practices", description: "Design patterns and tips" },
    ];
</script>

<div class="grid md:grid-cols-4 gap-4">
    {#each links as link}
        <Card.Root class="hover:border-primary/50 transition-colors cursor-pointer">
            <Card.Header class="pb-2">
                <link.icon class="h-8 w-8 text-primary mb-2" />
                <Card.Title class="text-lg">{link.title}</Card.Title>
            </Card.Header>
            <Card.Content>
                <p class="text-sm text-muted-foreground">{link.description}</p>
            </Card.Content>
        </Card.Root>
    {/each}
</div>
