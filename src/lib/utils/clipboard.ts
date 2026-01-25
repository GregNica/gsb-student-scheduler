import { toast } from "svelte-sonner";

export function copyToClipboard(
    value: string,
    options?: { message?: string; description?: string }
) {
    navigator.clipboard.writeText(value);
    toast.success(options?.message ?? "Copied!", {
        description: options?.description ?? `${value} copied to clipboard`,
    });
}
