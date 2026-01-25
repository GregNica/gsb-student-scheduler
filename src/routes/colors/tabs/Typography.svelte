<script lang="ts">
    import { Badge } from "$lib/components/ui/badge";
    import { Label } from "$lib/components/ui/label";
    import { Separator } from "$lib/components/ui/separator";
    import { CardSection, CopyableValue } from "$lib/components/sections";
    import TypeIcon from "@lucide/svelte/icons/type";

    const fontStack = `"Inter", "Noto Sans KR", ui-sans-serif, system-ui, sans-serif`;

    const fontWeights = [
        { weight: 400, name: "Regular", usage: "Body text, paragraphs" },
        { weight: 500, name: "Medium", usage: "Labels, subtle emphasis" },
        { weight: 600, name: "Semibold", usage: "Subheadings, buttons" },
        { weight: 700, name: "Bold", usage: "Headings, strong emphasis" },
    ];

    const fontSizes = [
        { size: "text-xs", px: "12px", usage: "Captions, fine print" },
        { size: "text-sm", px: "14px", usage: "Secondary text, labels" },
        { size: "text-base", px: "16px", usage: "Body text (default)" },
        { size: "text-lg", px: "18px", usage: "Lead paragraphs" },
        { size: "text-xl", px: "20px", usage: "Section headings" },
        { size: "text-2xl", px: "24px", usage: "Card titles" },
        { size: "text-3xl", px: "30px", usage: "Page headings" },
    ];
</script>

<div class="space-y-6">
    <CardSection title="Typography System" description="Font families and usage guidelines for the SKKU design system">
        {#snippet icon()}<TypeIcon class="h-5 w-5" />{/snippet}

        <div class="space-y-6">
            <div class="rounded-lg border p-4 bg-muted/30">
                <h4 class="font-semibold mb-2">About the Fonts</h4>
                <p class="text-sm text-muted-foreground mb-3">
                    SKKU officially uses <strong>Frutiger</strong> (Latin) and <strong>Yoon Gothic</strong> (Korean) for brand materials. Since these are commercial fonts, this design system uses free alternatives that maintain a similar professional aesthetic:
                </p>
                <div class="grid md:grid-cols-2 gap-4 text-sm">
                    <div class="space-y-1">
                        <p class="font-medium">Inter</p>
                        <p class="text-muted-foreground">Latin characters - designed for screens, highly legible</p>
                    </div>
                    <div class="space-y-1">
                        <p class="font-medium">Noto Sans KR</p>
                        <p class="text-muted-foreground">Korean characters - excellent CJK support</p>
                    </div>
                </div>
            </div>

            <div>
                <Label class="mb-2 block">Font Stack (CSS)</Label>
                <CopyableValue value={fontStack} />
            </div>
        </div>
    </CardSection>

    <CardSection title="Font Weights" description="Available weights and their recommended usage">
        <div class="space-y-4">
            {#each fontWeights as fw}
                <div class="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 border">
                    <div class="w-20 text-center">
                        <span class="text-2xl" style="font-weight: {fw.weight}">Aa</span>
                    </div>
                    <div class="flex-1">
                        <p class="font-medium">{fw.name}</p>
                        <p class="text-xs text-muted-foreground font-mono">font-weight: {fw.weight}</p>
                    </div>
                    <Badge variant="secondary">{fw.usage}</Badge>
                </div>
            {/each}
        </div>
    </CardSection>

    <CardSection title="Font Sizes" description="Type scale with Tailwind CSS classes">
        <div class="space-y-3">
            {#each fontSizes as fs}
                <div class="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50">
                    <div class="w-24">
                        <code class="text-xs bg-muted px-2 py-1 rounded">{fs.size}</code>
                    </div>
                    <div class="w-16 text-muted-foreground text-sm">{fs.px}</div>
                    <div class="flex-1 {fs.size}">The quick brown fox</div>
                    <div class="text-xs text-muted-foreground hidden md:block w-40">{fs.usage}</div>
                </div>
            {/each}
        </div>
    </CardSection>

    <CardSection title="Font Specimen" description="Preview of the complete character set">
        <div class="space-y-6">
            <div>
                <Label class="mb-2 block text-muted-foreground">Latin (Inter)</Label>
                <p class="text-2xl">
                    ABCDEFGHIJKLMNOPQRSTUVWXYZ<br />
                    abcdefghijklmnopqrstuvwxyz<br />
                    0123456789 !@#$%^&*()
                </p>
            </div>
            <Separator />
            <div>
                <Label class="mb-2 block text-muted-foreground">Korean (Noto Sans KR)</Label>
                <p class="text-2xl">
                    성균관대학교<br />
                    가나다라마바사아자차카타파하<br />
                    인문사회과학캠퍼스 자연과학캠퍼스
                </p>
            </div>
            <Separator />
            <div>
                <Label class="mb-2 block text-muted-foreground">Mixed Content</Label>
                <p class="text-lg">
                    SKKU(성균관대학교)는 1398년에 설립된 대한민국의 명문 사립대학교입니다. The university has two campuses: Humanities & Social Sciences Campus in Seoul and Natural Sciences Campus in Suwon.
                </p>
            </div>
        </div>
    </CardSection>
</div>
