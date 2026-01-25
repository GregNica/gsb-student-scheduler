<script lang="ts">
    import { Switch } from "$lib/components/ui/switch";
    import { Separator } from "$lib/components/ui/separator";
    import * as Alert from "$lib/components/ui/alert";
    import { CardSection, SettingRow } from "$lib/components/sections";
    import CheckCircleIcon from "@lucide/svelte/icons/check-circle";
</script>

<div class="space-y-4">
    <Alert.Root>
        <CheckCircleIcon class="h-4 w-4" />
        <Alert.Title>Notifications Enabled</Alert.Title>
        <Alert.Description>
            You're all set to receive notifications. Customize your preferences below.
        </Alert.Description>
    </Alert.Root>

    <CardSection title="Email Notifications" description="Configure which emails you want to receive">
        <div class="space-y-4">
            <SettingRow label="Marketing Emails" description="Receive product updates and news">
                <Switch />
            </SettingRow>
            <Separator />
            <SettingRow label="Security Alerts" description="Important security notifications">
                <Switch checked />
            </SettingRow>
            <Separator />
            <SettingRow label="Weekly Digest" description="Summary of your activity">
                <Switch checked />
            </SettingRow>
            <Separator />
            <SettingRow label="Comment Notifications" description="When someone mentions you">
                <Switch checked />
            </SettingRow>
        </div>
    </CardSection>

    <CardSection title="Push Notifications" description="Browser notification preferences">
        <div class="space-y-4">
            <SettingRow label="Enable Push Notifications" description="Receive real-time updates">
                <Switch />
            </SettingRow>
            <Separator />
            <SettingRow label="Notification Sound" description="Play sound for notifications">
                <Switch />
            </SettingRow>
        </div>
    </CardSection>
</div>
