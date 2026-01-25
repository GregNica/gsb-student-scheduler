<script lang="ts">
    import { Progress } from "$lib/components/ui/progress";
    import * as Avatar from "$lib/components/ui/avatar";
    import * as Pagination from "$lib/components/ui/pagination";
    import { CardSection } from "$lib/components/sections";
</script>

<div class="space-y-4">
    <CardSection title="Avatar" description="User avatars with fallback support">
        <div class="flex gap-4">
            <Avatar.Root class="h-12 w-12">
                <Avatar.Image src="https://github.com/shadcn.png" alt="@shadcn" />
                <Avatar.Fallback>CN</Avatar.Fallback>
            </Avatar.Root>
            <Avatar.Root class="h-12 w-12">
                <Avatar.Fallback class="bg-primary text-primary-foreground">JD</Avatar.Fallback>
            </Avatar.Root>
            <Avatar.Root class="h-12 w-12">
                <Avatar.Fallback class="bg-skku-blue text-white">SK</Avatar.Fallback>
            </Avatar.Root>
            <Avatar.Root class="h-12 w-12">
                <Avatar.Fallback class="bg-skku-orange text-white">KU</Avatar.Fallback>
            </Avatar.Root>
        </div>
    </CardSection>

    <CardSection title="Progress & Loading" description="Progress bars and loading indicators">
        <div class="space-y-4">
            <div class="space-y-2">
                <div class="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>25%</span>
                </div>
                <Progress value={25} />
            </div>
            <div class="space-y-2">
                <div class="flex justify-between text-sm">
                    <span>Processing...</span>
                    <span>60%</span>
                </div>
                <Progress value={60} />
            </div>
            <div class="space-y-2">
                <div class="flex justify-between text-sm">
                    <span>Complete!</span>
                    <span>100%</span>
                </div>
                <Progress value={100} />
            </div>
        </div>
    </CardSection>

    <CardSection title="Pagination" description="Navigate through pages of content">
        <Pagination.Root count={100} perPage={10} siblingCount={1}>
            {#snippet children({ pages, currentPage })}
                <Pagination.Content>
                    <Pagination.Item>
                        <Pagination.PrevButton />
                    </Pagination.Item>
                    {#each pages as page (page.key)}
                        {#if page.type === "ellipsis"}
                            <Pagination.Item>
                                <Pagination.Ellipsis />
                            </Pagination.Item>
                        {:else}
                            <Pagination.Item>
                                <Pagination.Link {page} isActive={currentPage === page.value}>
                                    {page.value}
                                </Pagination.Link>
                            </Pagination.Item>
                        {/if}
                    {/each}
                    <Pagination.Item>
                        <Pagination.NextButton />
                    </Pagination.Item>
                </Pagination.Content>
            {/snippet}
        </Pagination.Root>
    </CardSection>
</div>
