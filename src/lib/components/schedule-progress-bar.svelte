<script lang="ts">
	// @ Schedule progress bar with step navigation
	// # Purpose: Top navigation bar for the 3-step schedule flow (Setup → Review → Download)

	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import CheckIcon from '@lucide/svelte/icons/check';

	const steps = [
		{ label: 'Schedule Setup', path: '/setup' },
		{ label: 'Review Schedule', path: '/schedule-review' },
		{ label: 'Download Calendar', path: '/calendar-download' },
	];

	// / Derive current step index from the URL
	const currentIndex = $derived(
		Math.max(0, steps.findIndex((s) => page.url.pathname === s.path))
	);

	function goToStep(index: number) {
		if (index >= 0 && index < steps.length) {
			goto(steps[index].path);
		}
	}

	function goPrev() {
		if (currentIndex > 0) goToStep(currentIndex - 1);
	}

	function goNext() {
		if (currentIndex < steps.length - 1) goToStep(currentIndex + 1);
	}
</script>

<nav class="border-b bg-background sticky top-0 z-50">
	<div class="max-w-4xl mx-auto px-4 py-3">
		<div class="flex items-center gap-4">
			<!-- @ Prev arrow -->
			<button
				onclick={goPrev}
				disabled={currentIndex === 0}
				class="p-1.5 rounded-md transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
				aria-label="Previous step"
			>
				<ChevronLeftIcon class="w-5 h-5" />
			</button>

			<!-- @ Steps -->
			<div class="flex-1 flex items-center">
				{#each steps as step, i}
					<!-- Step circle + label -->
					<button
						onclick={() => goToStep(i)}
						class="flex items-center gap-2 group"
						aria-current={i === currentIndex ? 'step' : undefined}
					>
						<div
							class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
								{i < currentIndex
									? 'bg-green-600 text-white'
									: i === currentIndex
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-muted-foreground'}"
						>
							{#if i < currentIndex}
								<CheckIcon class="w-4 h-4" />
							{:else}
								{i + 1}
							{/if}
						</div>
						<span
							class="text-sm hidden sm:inline transition-colors
								{i === currentIndex
									? 'font-semibold text-foreground'
									: i < currentIndex
										? 'text-green-700 dark:text-green-400'
										: 'text-muted-foreground'}"
						>
							{step.label}
						</span>
					</button>

					<!-- Connector line -->
					{#if i < steps.length - 1}
						<div
							class="flex-1 h-0.5 mx-3
								{i < currentIndex ? 'bg-green-600' : 'bg-muted'}"
						></div>
					{/if}
				{/each}
			</div>

			<!-- @ Next arrow -->
			<button
				onclick={goNext}
				disabled={currentIndex === steps.length - 1}
				class="p-1.5 rounded-md transition-colors hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
				aria-label="Next step"
			>
				<ChevronRightIcon class="w-5 h-5" />
			</button>
		</div>
	</div>
</nav>
