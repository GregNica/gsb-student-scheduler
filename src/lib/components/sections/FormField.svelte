<script lang="ts">
    import { Label } from "$lib/components/ui/label";
    import { Input } from "$lib/components/ui/input";
    import { Textarea } from "$lib/components/ui/textarea";

    type Props = {
        label: string;
        id: string;
        type?: "text" | "email" | "password" | "textarea";
        placeholder?: string;
        value?: string;
        disabled?: boolean;
    };

    let { label, id, type = "text", placeholder, value = "", disabled = false }: Props = $props();
</script>

<div class="space-y-2">
    <Label for={id}>{label}</Label>
    {#if type === "textarea"}
        <Textarea {id} {placeholder} {value} {disabled} />
    {:else}
        <Input {id} {type} {placeholder} {value} {disabled} />
    {/if}
</div>
