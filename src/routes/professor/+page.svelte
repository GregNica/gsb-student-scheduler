<script lang="ts">
	// @ Professor Schedule Setup page
	// # Purpose: Select semester and instructor name to preview and download course schedule

	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { goto } from '$lib/utils/navigation';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import LoaderIcon from '@lucide/svelte/icons/loader';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import UserIcon from '@lucide/svelte/icons/user';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import {
		fetchCoursesData,
		getInstructorsForSemester,
		getCoursesForInstructor,
		type CoursesFile,
		type SemesterData,
	} from '$lib/utils/coursesData';
	import {
		storePreSelectedCourses,
		type DateRange,
		type ReviewedCourse,
	} from '$lib/utils/scheduleReviewStorage';

	// @ State
	let coursesFile: CoursesFile | null = $state(null);
	let loadError = $state('');
	let isLoading = $state(true);
	let selectedSemesterIds: string[] = $state([]);
	let selectedInstructor = $state('');
	let formErrors: string[] = $state([]);

	// @ Load courses.json on mount
	$effect(() => {
		fetchCoursesData()
			.then((data) => {
				coursesFile = data;
				isLoading = false;
			})
			.catch((err) => {
				loadError = err instanceof Error ? err.message : 'Failed to load course data';
				isLoading = false;
			});
	});

	// @ Derived: semesters list sorted by id
	function getSemesters(cf: CoursesFile | null): SemesterData[] {
		if (!cf) return [];
		return Object.values(cf.semesters) as SemesterData[];
	}
	let semesters = $derived(getSemesters(coursesFile));

	// @ Group semesters by category
	let semestersByCategory = $derived((): Record<string, SemesterData[]> => {
		const groups: Record<string, SemesterData[]> = {};
		for (const sem of semesters) {
			if (!groups[sem.category]) groups[sem.category] = [];
			groups[sem.category].push(sem);
		}
		return groups;
	});

	// @ Derived: selected semester objects
	let selectedSemesters = $derived(
		semesters.filter((s) => selectedSemesterIds.includes(s.id))
	);

	// @ Derived: combined semester label
	let semesterLabel = $derived(
		selectedSemesters.map((s) => s.label).join(', ') || ''
	);

	// @ Derived: combined date ranges from selected semesters
	let semesterDateRanges = $derived((): DateRange[] => {
		const ranges: DateRange[] = [];
		for (const sem of selectedSemesters) {
			for (const r of sem.dateRanges) {
				ranges.push({ start: r.start, end: r.end, label: r.label });
			}
		}
		ranges.sort((a, b) => a.start.localeCompare(b.start));
		return ranges;
	});

	// @ Derived: instructors available across selected semesters
	let availableInstructors = $derived((): string[] => {
		if (!coursesFile || selectedSemesterIds.length === 0) return [];
		const instructorSet = new Set<string>();
		for (const id of selectedSemesterIds) {
			for (const name of getInstructorsForSemester(coursesFile, id)) {
				instructorSet.add(name);
			}
		}
		return Array.from(instructorSet).sort();
	});

	// @ Derived: courses for selected instructor across selected semesters
	let instructorCourses = $derived((): ReviewedCourse[] => {
		if (!coursesFile || !selectedInstructor || selectedSemesterIds.length === 0) return [];

		const allCourses: ReviewedCourse[] = [];
		const seen = new Set<string>();

		for (const semId of selectedSemesterIds) {
			const courses = getCoursesForInstructor(coursesFile, semId, selectedInstructor);
			for (const c of courses) {
				const key = c.courseCode || c.courseTitle;
				if (!seen.has(key)) {
					seen.add(key);
					allCourses.push(c as ReviewedCourse);
				}
			}
		}

		// Sort by day order then start time
		const DAY_ORDER: Record<string, number> = {
			Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
			Friday: 4, Saturday: 5, Sunday: 6,
		};
		return allCourses.sort((a, b) => {
			const aSlot = a.meetingSlots[0];
			const bSlot = b.meetingSlots[0];
			if (!aSlot) return 1;
			if (!bSlot) return -1;
			const dayDiff = (DAY_ORDER[aSlot.day] ?? 99) - (DAY_ORDER[bSlot.day] ?? 99);
			if (dayDiff !== 0) return dayDiff;
			return aSlot.startTime.localeCompare(bSlot.startTime);
		});
	});

	// @ Toggle semester selection
	function toggleSemester(id: string, checked: boolean) {
		if (checked) {
			selectedSemesterIds = [...selectedSemesterIds, id];
		} else {
			selectedSemesterIds = selectedSemesterIds.filter((s) => s !== id);
		}
		// Clear instructor if no longer available
		if (selectedInstructor && !availableInstructors().includes(selectedInstructor)) {
			selectedInstructor = '';
		}
	}

	// @ Format date for display
	function formatDateDisplay(dateStr: string): string {
		if (!dateStr) return '';
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	// @ Handle continue
	function handleContinue() {
		formErrors = [];

		if (selectedSemesterIds.length === 0) {
			formErrors.push('Please select at least one semester period');
		}
		if (!selectedInstructor) {
			formErrors.push('Please select your name');
		}
		if (instructorCourses().length === 0) {
			formErrors.push('No courses found for the selected instructor and semester');
		}

		if (formErrors.length > 0) return;

		const courses = instructorCourses();
		const dateRanges = semesterDateRanges();

		storePreSelectedCourses(courses, semesterLabel, dateRanges);
		goto('/professor/schedule-review');
	}
</script>

<div class="flex flex-col gap-6">
	<!-- @ Page header -->
	<div>
		<h1 class="text-3xl font-bold">Professor Schedule Setup</h1>
		<p class="text-muted-foreground mt-2">
			Select your semester and name to preview your teaching schedule and download a calendar file.
		</p>
	</div>

	<!-- @ Loading state -->
	{#if isLoading}
		<Card class="p-12">
			<div class="flex flex-col items-center gap-4 text-muted-foreground">
				<LoaderIcon class="w-8 h-8 animate-spin" />
				<p>Loading course data...</p>
			</div>
		</Card>

	<!-- @ Load error -->
	{:else if loadError}
		<Card class="p-8">
			<div class="flex items-start gap-3">
				<AlertCircleIcon class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
				<div>
					<p class="font-semibold text-red-900 dark:text-red-100">Could not load course data</p>
					<p class="text-sm text-red-800 dark:text-red-200 mt-1">{loadError}</p>
					<p class="text-sm text-muted-foreground mt-2">
						Course data must be published by an administrator before this app can be used.
					</p>
				</div>
			</div>
		</Card>

	{:else}
		<!-- @ Form errors -->
		{#if formErrors.length > 0}
			<div class="flex items-start gap-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
				<AlertCircleIcon class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
				<div>
					<p class="font-semibold text-red-900 dark:text-red-100">Please fix the following:</p>
					<ul class="text-sm text-red-800 dark:text-red-200 mt-2 space-y-1">
						{#each formErrors as error}
							<li>• {error}</li>
						{/each}
					</ul>
				</div>
			</div>
		{/if}

		<Card class="p-8">
			<form onsubmit={(e) => { e.preventDefault(); handleContinue(); }} class="space-y-8">

				<!-- / Section 1: Semester -->
				<div class="space-y-4">
					<h2 class="text-lg font-semibold border-b pb-2 flex items-center gap-2">
						<CalendarIcon class="w-5 h-5" />
						Semester Period
					</h2>

					{#if semesters.length === 0}
						<p class="text-sm text-muted-foreground">No semester data available yet.</p>
					{:else}
						<div class="space-y-6">
							{#each Object.entries(semestersByCategory()) as [category, categorySemesters]}
								<div class="space-y-3">
									<h3 class="font-medium text-sm">{category}</h3>
									<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
										{#each categorySemesters as semester}
											{@const hasData = semester.courses.length > 0}
											<label
												class="flex items-start gap-3 p-3 rounded-lg border transition-colors
													{!hasData
														? 'border-muted opacity-50 cursor-not-allowed'
														: selectedSemesterIds.includes(semester.id)
															? 'border-primary bg-primary/5 cursor-pointer'
															: 'border-muted hover:border-muted-foreground/50 cursor-pointer'}"
											>
												<Checkbox
													checked={selectedSemesterIds.includes(semester.id)}
													disabled={!hasData}
													onCheckedChange={(checked) => hasData && toggleSemester(semester.id, !!checked)}
													class="mt-0.5"
												/>
												<div class="flex-1 min-w-0">
													<div class="font-medium text-sm">{semester.label}</div>
													<div class="text-xs text-muted-foreground mt-0.5">
														{semester.description}
													</div>
													{#if !hasData}
														<div class="text-xs text-amber-600 dark:text-amber-400 mt-1">Coming soon</div>
													{/if}
												</div>
											</label>
										{/each}
									</div>
								</div>
							{/each}
						</div>

						<!-- @ Selected semester summary -->
						{#if selectedSemesters.length > 0}
							<div class="bg-muted/50 rounded-lg p-4 space-y-2">
								<div class="flex items-center gap-2">
									<CheckCircleIcon class="w-4 h-4 text-green-600" />
									<span class="font-medium text-sm">Selected: {semesterLabel}</span>
								</div>
								<div class="text-xs text-muted-foreground space-y-1">
									{#each semesterDateRanges() as range, i}
										<p>
											<span class="font-medium">{range.label || `Range ${i + 1}`}:</span>
											{formatDateDisplay(range.start)} — {formatDateDisplay(range.end)}
										</p>
									{/each}
								</div>
							</div>
						{/if}
					{/if}
				</div>

				<!-- / Section 2: Instructor name -->
				{#if selectedSemesterIds.length > 0}
					<div class="space-y-4">
						<h2 class="text-lg font-semibold border-b pb-2 flex items-center gap-2">
							<UserIcon class="w-5 h-5" />
							Your Name
						</h2>

						{#if availableInstructors().length === 0}
							<p class="text-sm text-muted-foreground">No instructors found in course data for the selected semester(s).</p>
						{:else}
							<div class="flex flex-wrap gap-2">
								{#each availableInstructors() as name}
									<button
										type="button"
										onclick={() => selectedInstructor = name}
										class="px-4 py-2 rounded-full border text-sm transition-colors
											{selectedInstructor === name
												? 'border-primary bg-primary text-primary-foreground'
												: 'border-muted hover:border-muted-foreground/50'}"
									>
										{name}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<!-- / Section 3: Course preview -->
				{#if selectedInstructor && instructorCourses().length > 0}
					<div class="space-y-4">
						<h2 class="text-lg font-semibold border-b pb-2 flex items-center gap-2">
							<BookOpenIcon class="w-5 h-5" />
							Your Courses ({instructorCourses().length})
						</h2>

						<div class="space-y-3">
							{#each instructorCourses() as course}
								<div class="border rounded-lg p-4">
									<div class="flex items-start justify-between gap-2">
										<div>
											<div class="flex items-center gap-2">
												<h3 class="font-semibold">{course.courseTitle}</h3>
												{#if course.program && course.program !== 'unknown'}
													<span class="text-xs px-2 py-0.5 rounded-full font-medium
														{course.program === 'FMBA'
															? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
															: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'}">
														{course.program}
													</span>
												{/if}
											</div>
											{#if course.courseCode}
												<p class="text-sm text-muted-foreground">{course.courseCode}</p>
											{/if}
										</div>
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
								</div>
							{/each}
						</div>
					</div>
				{:else if selectedInstructor && instructorCourses().length === 0}
					<div class="flex items-center gap-3 bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
						<AlertCircleIcon class="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
						<p class="text-sm text-amber-800 dark:text-amber-200">
							No courses found for {selectedInstructor} in the selected semester(s).
						</p>
					</div>
				{/if}

				<!-- @ Submit -->
				<div class="flex gap-3 pt-4 border-t">
					<Button
						type="submit"
						variant="default"
						class="flex-1"
						disabled={!selectedInstructor || instructorCourses().length === 0}
					>
						Continue to Review
					</Button>
				</div>
			</form>
		</Card>
	{/if}
</div>
