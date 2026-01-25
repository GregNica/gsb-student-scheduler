<script lang="ts">
    import * as Accordion from "$lib/components/ui/accordion";
    import { CardSection, CodeBlock } from "$lib/components/sections";

    const codeExamples = {
        button: `<script>
  import { Button } from "$lib/components/ui/button";
<\/script>

<Button>Click me</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Delete</Button>`,
        card: `<script>
  import * as Card from "$lib/components/ui/card";
<\/script>

<Card.Root>
  <Card.Header>
    <Card.Title>Card Title</Card.Title>
    <Card.Description>Card description</Card.Description>
  </Card.Header>
  <Card.Content>
    <p>Card content goes here.</p>
  </Card.Content>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card.Root>`,
        dialog: `<script>
  import * as Dialog from "$lib/components/ui/dialog";
<\/script>

<Dialog.Root>
  <Dialog.Trigger>
    <Button>Open Dialog</Button>
  </Dialog.Trigger>
  <Dialog.Content>
    <Dialog.Header>
      <Dialog.Title>Dialog Title</Dialog.Title>
      <Dialog.Description>
        Dialog description here.
      </Dialog.Description>
    </Dialog.Header>
    <Dialog.Footer>
      <Button>Confirm</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>`,
    };
</script>

<CardSection title="Code Examples" description="Copy-paste ready code snippets">
    <Accordion.Root type="single" class="w-full">
        <Accordion.Item value="button">
            <Accordion.Trigger>Button Component</Accordion.Trigger>
            <Accordion.Content>
                <CodeBlock code={codeExamples.button} />
            </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="card">
            <Accordion.Trigger>Card Component</Accordion.Trigger>
            <Accordion.Content>
                <CodeBlock code={codeExamples.card} />
            </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="dialog">
            <Accordion.Trigger>Dialog Component</Accordion.Trigger>
            <Accordion.Content>
                <CodeBlock code={codeExamples.dialog} />
            </Accordion.Content>
        </Accordion.Item>
    </Accordion.Root>
</CardSection>
