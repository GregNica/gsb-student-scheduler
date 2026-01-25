<script lang="ts">
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Label } from "$lib/components/ui/label";
    import { Switch } from "$lib/components/ui/switch";
    import * as Card from "$lib/components/ui/card";
    import * as Alert from "$lib/components/ui/alert";
    import * as AlertDialog from "$lib/components/ui/alert-dialog";
    import { CardSection, SettingRow } from "$lib/components/sections";
    import { toast } from "svelte-sonner";
    import AlertTriangleIcon from "@lucide/svelte/icons/alert-triangle";
</script>

<div class="space-y-4">
    <Alert.Root variant="destructive">
        <AlertTriangleIcon class="h-4 w-4" />
        <Alert.Title>Security Recommendation</Alert.Title>
        <Alert.Description>
            Enable two-factor authentication for better account security.
        </Alert.Description>
    </Alert.Root>

    <Card.Root>
        <Card.Header>
            <Card.Title>Password</Card.Title>
            <Card.Description>Change your password</Card.Description>
        </Card.Header>
        <Card.Content class="space-y-4">
            <div class="space-y-2">
                <Label for="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
            </div>
            <div class="space-y-2">
                <Label for="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
            </div>
            <div class="space-y-2">
                <Label for="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" />
            </div>
        </Card.Content>
        <Card.Footer>
            <Button onclick={() => toast.success("Password updated!")}>Update Password</Button>
        </Card.Footer>
    </Card.Root>

    <CardSection title="Two-Factor Authentication" description="Add an extra layer of security">
        <SettingRow label="Enable 2FA" description="Require a code when signing in">
            <Switch />
        </SettingRow>
    </CardSection>

    <Card.Root class="border-destructive">
        <Card.Header>
            <Card.Title class="text-destructive">Danger Zone</Card.Title>
            <Card.Description>Irreversible and destructive actions</Card.Description>
        </Card.Header>
        <Card.Content>
            <SettingRow label="Delete Account" description="Permanently delete your account and all data">
                <AlertDialog.Root>
                    <AlertDialog.Trigger>
                        <Button variant="destructive">Delete Account</Button>
                    </AlertDialog.Trigger>
                    <AlertDialog.Content>
                        <AlertDialog.Header>
                            <AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
                            <AlertDialog.Description>
                                This action cannot be undone. This will permanently delete your account and remove your data from our servers.
                            </AlertDialog.Description>
                        </AlertDialog.Header>
                        <AlertDialog.Footer>
                            <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                            <AlertDialog.Action onclick={() => toast.error("Account deletion cancelled for demo")}>
                                Yes, delete my account
                            </AlertDialog.Action>
                        </AlertDialog.Footer>
                    </AlertDialog.Content>
                </AlertDialog.Root>
            </SettingRow>
        </Card.Content>
    </Card.Root>
</div>
