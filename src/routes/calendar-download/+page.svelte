<script lang="ts">
	// @ Calendar Download page
	// # Purpose: Preview confirmed courses and download as .ics calendar file

	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { goto } from '$lib/utils/navigation';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import DownloadIcon from '@lucide/svelte/icons/download';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import { untrack } from 'svelte';
	import {
		getScheduleReviewSession,
		clearScheduleReviewSession,
		type ScheduleReviewSession,
	} from '$lib/utils/scheduleReviewStorage';
	import { generateAndDownloadICS } from '$lib/utils/icsGenerator';

	// @ State - initialize session immediately
	let session: ScheduleReviewSession | null = $state(getScheduleReviewSession());
	let downloadComplete = $state(false);

	// / Redirect if no session (runs once on mount)
	$effect(() => {
		untrack(() => {
			if (!session) {
				goto('/setup');
			}
		});
	});

	// / Format date for display
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('en-US', {
			weekday: 'long',
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});
	}

	// / Handle download
	function handleDownload() {
		if (!session) return;

		// Use dateRanges if available, fall back to legacy semesterStart/End fields
		const dateRanges = session.dateRanges && session.dateRanges.length > 0
			? session.dateRanges
			: [{ start: session.semesterStart, end: session.semesterEnd }];

		generateAndDownloadICS(
			session.courses,
			dateRanges,
			session.semesterLabel
		);

		downloadComplete = true;
	}

	// / Go back to review
	function handleBack() {
		goto('/schedule-review');
	}

	// / Start over
	function handleStartOver() {
		clearScheduleReviewSession();
		goto('/setup');
	}

	// / Calculate total meeting count
	let totalMeetings = $derived(
		session?.courses.reduce((sum, c) => sum + c.meetingSlots.length, 0) ?? 0
	);
</script>

<div class="flex flex-col gap-6">
	{#if session}
		<!-- @ Header -->
		<div>
			<h1 class="text-3xl font-bold">Download Calendar</h1>
			<p class="text-muted-foreground mt-2">
				Your course schedule is ready. Download as a calendar file to import into your calendar app.
			</p>
		</div>

		<!-- @ Summary card -->
		<Card class="p-6 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 border-green-200 dark:border-green-800">
			<div class="flex items-start gap-4">
				<div class="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
					<CheckCircleIcon class="w-6 h-6 text-green-600 dark:text-green-400" />
				</div>
				<div class="flex-1">
					<h2 class="text-xl font-semibold text-green-900 dark:text-green-100">
						{session.semesterLabel}
					</h2>
					<p class="text-green-700 dark:text-green-300 mt-1">
						{session.courses.length} course{session.courses.length !== 1 ? 's' : ''} &bull;
						{totalMeetings} weekly meeting{totalMeetings !== 1 ? 's' : ''}
					</p>
					<div class="text-sm text-green-600 dark:text-green-400 mt-2 space-y-1">
						{#if session.dateRanges && session.dateRanges.length > 0}
							{#each session.dateRanges as range}
								<p>
									{#if range.label}<span class="font-medium">{range.label}:</span>{/if}
									{formatDate(range.start)} — {formatDate(range.end)}
								</p>
							{/each}
						{:else}
							<p>{formatDate(session.semesterStart)} — {formatDate(session.semesterEnd)}</p>
						{/if}
					</div>
				</div>
			</div>
		</Card>

		<!-- @ Download section -->
		<Card class="p-8">
			<div class="flex flex-col items-center text-center gap-6">
				<div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
					<CalendarIcon class="w-10 h-10 text-primary" />
				</div>

				<div>
					<h2 class="text-2xl font-semibold">Ready to Download</h2>
					<p class="text-muted-foreground mt-2 max-w-md">
						Click the button below to download your .ics calendar file.
						This file works with Google Calendar, Apple Calendar, Outlook, and other calendar apps.
					</p>
				</div>

				<Button
					onclick={handleDownload}
					size="lg"
					class="gap-2 px-8 py-6 text-lg"
				>
					<DownloadIcon class="w-5 h-5" />
					Download Calendar File
				</Button>

				{#if downloadComplete}
					<div class="flex items-center gap-2 text-green-600 dark:text-green-400">
						<CheckCircleIcon class="w-5 h-5" />
						<span>Download started! Check your downloads folder.</span>
					</div>
				{/if}
			</div>
		</Card>

		<!-- @ Course preview -->
		<Card class="p-6">
			<h2 class="text-lg font-semibold mb-4">Courses Included</h2>
			<div class="space-y-4">
				{#each session.courses as course}
					<div class="border rounded-lg p-4">
						<div class="flex items-start justify-between">
							<div>
								<h3 class="font-semibold">{course.courseTitle}</h3>
								{#if course.courseCode}
									<p class="text-sm text-muted-foreground">{course.courseCode}</p>
								{/if}
							</div>
							{#if course.instructor}
								<span class="text-sm text-muted-foreground">{course.instructor}</span>
							{/if}
						</div>

						<div class="mt-3 flex flex-wrap gap-2">
							{#each course.meetingSlots as slot}
								<div class="flex items-center gap-2 text-sm bg-muted rounded-md px-3 py-1.5">
									<ClockIcon class="w-3.5 h-3.5 text-muted-foreground" />
									<span class="font-medium">{slot.day.slice(0, 3)}</span>
									<span>{slot.startTime} - {slot.endTime}</span>
									{#if slot.room}
										<MapPinIcon class="w-3.5 h-3.5 text-muted-foreground ml-1" />
										<span class="text-muted-foreground">{slot.room}</span>
									{/if}
								</div>
							{/each}
						</div>
						{#if course.dateRanges && course.dateRanges.length > 0}
							<div class="mt-2 text-xs text-muted-foreground">
								{#each course.dateRanges as range}
									<span class="inline-block mr-3">
										{#if range.label}<span class="font-medium">{range.label}:</span>{/if}
										{new Date(range.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {new Date(range.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</Card>

		<!-- @ Import instructions -->
		<Card class="p-6 bg-muted/50">
			<h2 class="text-lg font-semibold mb-4">How to Import</h2>
			<div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
				<div>
					<h3 class="font-semibold mb-2">Google Calendar</h3>
					<ol class="space-y-1 text-muted-foreground list-decimal list-inside">
						<li>Open Google Calendar</li>
						<li>Click the gear icon &rarr; Settings</li>
						<li>Click "Import & export"</li>
						<li>Select the downloaded .ics file</li>
						<li>Click "Import"</li>
					</ol>
				</div>
				<div>
					<h3 class="font-semibold mb-2">Apple Calendar</h3>
					<ol class="space-y-1 text-muted-foreground list-decimal list-inside">
						<li>Double-click the .ics file</li>
						<li>Calendar app will open automatically</li>
						<li>Choose which calendar to add to</li>
						<li>Click "OK" or "Add"</li>
					</ol>
				</div>
				<div>
					<h3 class="font-semibold mb-2">Outlook</h3>
					<ol class="space-y-1 text-muted-foreground list-decimal list-inside">
						<li>Open Outlook Calendar</li>
						<li>Click "Add calendar" &rarr; "Upload from file"</li>
						<li>Select the downloaded .ics file</li>
						<li>Click "Import"</li>
					</ol>
				</div>
			</div>
		</Card>

		<!-- @ Action buttons -->
		<div class="flex gap-4 justify-between">
			<Button onclick={handleBack} variant="outline" class="gap-2">
				<ArrowLeftIcon class="w-4 h-4" />
				Back to Review
			</Button>
			<Button onclick={handleStartOver} variant="secondary">
				Start Over
			</Button>
		</div>
	{:else}
		<div class="flex items-center justify-center h-64">
			<p class="text-muted-foreground">Loading...</p>
		</div>
	{/if}
</div>
