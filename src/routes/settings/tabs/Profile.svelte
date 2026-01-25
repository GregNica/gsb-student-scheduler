<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Textarea } from "$lib/components/ui/textarea";
    import { Separator } from "$lib/components/ui/separator";
    import * as Card from "$lib/components/ui/card";
    import * as Avatar from "$lib/components/ui/avatar";
    import * as Select from "$lib/components/ui/select";
    import { toast } from "svelte-sonner";
</script>

<Card.Root>
    <Card.Header>
        <Card.Title>Profile Information</Card.Title>
        <Card.Description>Update your personal details</Card.Description>
    </Card.Header>
    <Card.Content class="space-y-6">
        <div class="flex items-center gap-6">
            <Avatar.Root class="h-20 w-20">
                <Avatar.Fallback class="bg-primary text-primary-foreground text-2xl">SK</Avatar.Fallback>
            </Avatar.Root>
            <div class="space-y-2">
                <Button variant="outline">Change Avatar</Button>
                <p class="text-xs text-muted-foreground">JPG, PNG or GIF. Max 2MB.</p>
            </div>
        </div>
        <Separator />
        <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
                <Label for="firstName">First Name</Label>
                <Input id="firstName" value="Sung" />
            </div>
            <div class="space-y-2">
                <Label for="lastName">Last Name</Label>
                <Input id="lastName" value="Kyun" />
            </div>
            <div class="space-y-2">
                <Label for="email">Email</Label>
                <Input id="email" type="email" value="user@skku.edu" />
            </div>
            <div class="space-y-2">
                <Label for="phone">Phone</Label>
                <Input id="phone" type="tel" placeholder="+82 10-1234-5678" />
            </div>
        </div>
        <div class="space-y-2">
            <Label for="bio">Bio</Label>
            <Textarea id="bio" placeholder="Tell us about yourself..." class="min-h-[100px]" />
        </div>
        <div class="space-y-2">
            <Label>Department</Label>
            <Select.Root type="single">
                <Select.Trigger class="w-full md:w-[300px]">
                    <span data-slot="select-value">Select department</span>
                </Select.Trigger>
                <Select.Content>
                    <Select.Group>
                        <Select.Label>Natural Sciences</Select.Label>
                        <Select.Item value="cs">Computer Science</Select.Item>
                        <Select.Item value="ee">Electrical Engineering</Select.Item>
                        <Select.Item value="physics">Physics</Select.Item>
                    </Select.Group>
                    <Select.Separator />
                    <Select.Group>
                        <Select.Label>Humanities</Select.Label>
                        <Select.Item value="lit">Literature</Select.Item>
                        <Select.Item value="history">History</Select.Item>
                        <Select.Item value="philosophy">Philosophy</Select.Item>
                    </Select.Group>
                </Select.Content>
            </Select.Root>
        </div>
    </Card.Content>
    <Card.Footer>
        <Button onclick={() => toast.success("Profile saved successfully!")}>Save Changes</Button>
    </Card.Footer>
</Card.Root>
