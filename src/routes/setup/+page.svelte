<script lang="ts">
	// @ Student Schedule Setup
	// # Purpose: Student selects program, semester(s), and their courses from pre-loaded data.
	// # Course data is published by the admin app (gsb-scheduler-admin) via the GitHub API.

	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { goto } from '$lib/utils/navigation';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import LoaderIcon from '@lucide/svelte/icons/loader';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import GraduationCapIcon from '@lucide/svelte/icons/graduation-cap';
	import UserIcon from '@lucide/svelte/icons/user';
	import { onMount } from 'svelte';
	import { fetchCoursesData, semesterHasData, type CoursesFile } from '$lib/utils/coursesData';
	import { storePreSelectedCourses, type DateRange } from '$lib/utils/scheduleReviewStorage';
	import type { ParsedCourse } from '$lib/utils/scheduleParser';

	// @ Preset semester definitions — keep in sync with admin and professor apps
	interface SemesterPeriod {
		id: string;
		label: string;
		description: string;
		category: string;
		startDate: string;
		endDate: string;
		startDate2?: string;
		endDate2?: string;
		tentative?: boolean;
	}

	const SEMESTER_PERIODS: SemesterPeriod[] = [
		{ id: 'sp1-2026', label: 'Sp1', description: 'Spring 1 (Jan 12 - Feb 27)', category: 'Spring 2026', startDate: '2026-01-12', endDate: '2026-02-13', startDate2: '2026-02-23', endDate2: '2026-02-27' },
		{ id: 'spiw1-2026', label: 'SpIW1', description: 'Spring Intensive Week 1 (Mar 2 - 6)', category: 'Spring 2026', startDate: '2026-03-02', endDate: '2026-03-06' },
		{ id: 'spiw2-2026', label: 'SpIW2', description: 'Spring Intensive Week 2 (Mar 16 - 20)', category: 'Spring 2026', startDate: '2026-03-16', endDate: '2026-03-20' },
		{ id: 'sp2-2026', label: 'Sp2', description: 'Spring 2 (Mar 23 - May 1)', category: 'Spring 2026', startDate: '2026-03-23', endDate: '2026-05-01' },
		{ id: 'gft-2026', label: 'GFT', description: 'Global Field Trip (May 4 - 8)', category: 'Spring 2026', startDate: '2026-05-04', endDate: '2026-05-08' },
		{ id: 'su-2026', label: 'Su', description: 'Summer (May 11 - Jun 19)', category: 'Summer 2026', startDate: '2026-05-11', endDate: '2026-06-19' },
		{ id: 'suiw-2026', label: 'SuIW', description: 'Summer Intensive Week (Jun 29 - Jul 3)', category: 'Summer 2026', startDate: '2026-06-29', endDate: '2026-07-03' },
		{ id: 'f1-2026', label: 'F1', description: 'Fall 1 (Aug 24 - Oct 9)', category: 'Fall 2026', startDate: '2026-08-24', endDate: '2026-09-21', startDate2: '2026-09-28', endDate2: '2026-10-09', tentative: true },
		{ id: 'fiw1-2026', label: 'FIW1', description: 'Fall Intensive Week 1 (Oct 12 - 16)', category: 'Fall 2026', startDate: '2026-10-12', endDate: '2026-10-16' },
		{ id: 'fiw2-2026', label: 'FIW2', description: 'Fall Intensive Week 2 (Oct 26 - 30)', category: 'Fall 2026', startDate: '2026-10-26', endDate: '2026-10-30' },
		{ id: 'f2-2026', label: 'F2', description: 'Fall 2 (Nov 2 - Dec 11)', category: 'Fall 2026', startDate: '2026-11-02', endDate: '2026-12-11', tentative: true },
	];

	// @ Group semesters by category
	const semestersByCategory = $derived(() => {
		const groups: Record<string, SemesterPeriod[]> = {};
		for (const s of SEMESTER_PERIODS) {
			if (!groups[s.category]) groups[s.category] = [];
			groups[s.category].push(s);
		}
		return groups;
	});

	// @ State
	let selectedProgram: 'MMS' | 'FMBA' | '' = $state('');
	let selectedSemesterIds: string[] = $state([]);
	let selectedCourseIds: Set<string> = $state(new Set());
	let coursesData: CoursesFile | null = $state(null);
	let loadStatus: 'loading' | 'loaded' | 'error' = $state('loading');
	let formErrors: string[] = $state([]);

	onMount(async () => {
		try {
			coursesData = await fetchCoursesData();
			loadStatus = 'loaded';
		} catch {
			loadStatus = 'error';
		}
	});

	// @ Derived
	let selectedSemesters = $derived(
		SEMESTER_PERIODS.filter((s) => selectedSemesterIds.includes(s.id))
	);

	let semesterLabel = $derived(
		selectedSemesters.map((s) => s.label).join(', ') || ''
	);

	// / Courses matching selected program + selected semesters (deduplicated by courseCode)
	let filteredCourses = $derived((): ParsedCourse[] => {
		if (!coursesData || !selectedProgram || selectedSemesterIds.length === 0) return [];

		const seen = new Set<string>();
		const result: ParsedCourse[] = [];

		for (const semId of selectedSemesterIds) {
			const semester = coursesData.semesters[semId];
			if (!semester) continue;
			for (const course of semester.courses) {
				if (course.program !== selectedProgram) continue;
				const key = course.courseCode || course.courseTitle;
				if (seen.has(key)) continue;
				seen.add(key);
				result.push(course);
			}
		}

		// Sort: earliest day → start time
		const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
		return result.sort((a, b) => {
			const dayA = Math.min(...a.meetingSlots.map((s) => DAY_ORDER.indexOf(s.day)).filter((i) => i >= 0), 99);
			const dayB = Math.min(...b.meetingSlots.map((s) => DAY_ORDER.indexOf(s.day)).filter((i) => i >= 0), 99);
			if (dayA !== dayB) return dayA - dayB;
			const timeA = a.meetingSlots[0]?.startTime ?? '';
			const timeB = b.meetingSlots[0]?.startTime ?? '';
			return timeA.localeCompare(timeB);
		});
	});

	let selectedCourses = $derived(
		filteredCourses().filter((c) => selectedCourseIds.has(c.courseCode || c.courseTitle))
	);

	// / Whether the selected semesters include any that have data
	let anySelectedSemesterHasData = $derived(
		coursesData !== null &&
		selectedSemesterIds.some((id) => semesterHasData(coursesData!, id))
	);

	// @ Handlers
	function toggleSemester(id: string, checked: boolean) {
		if (checked) {
			selectedSemesterIds = [...selectedSemesterIds, id];
		} else {
			selectedSemesterIds = selectedSemesterIds.filter((s) => s !== id);
			// Clear course selections that came from this semester's data
			if (coursesData) {
				const semester = coursesData.semesters[id];
				if (semester) {
					const keysToRemove = new Set(semester.courses.map((c) => c.courseCode || c.courseTitle));
					const next = new Set([...selectedCourseIds].filter((k) => !keysToRemove.has(k)));
					selectedCourseIds = next;
				}
			}
		}
	}

	function toggleCourse(key: string, checked: boolean) {
		const next = new Set(selectedCourseIds);
		if (checked) next.add(key);
		else next.delete(key);
		selectedCourseIds = next;
	}

	function handleContinue() {
		formErrors = [];

		if (!selectedProgram) formErrors.push('Please select your program (MMS or FMBA)');
		if (selectedSemesterIds.length === 0) formErrors.push('Please select at least one semester period');
		if (selectedCourses.length === 0) formErrors.push('Please select at least one course');

		if (formErrors.length > 0) return;

		// Build session date ranges from selected semester definitions
		const dateRanges: DateRange[] = [];
		for (const sem of selectedSemesters) {
			dateRanges.push({ start: sem.startDate, end: sem.endDate, label: sem.label });
			if (sem.startDate2 && sem.endDate2) {
				dateRanges.push({ start: sem.startDate2, end: sem.endDate2, label: sem.label });
			}
		}
		dateRanges.sort((a, b) => a.start.localeCompare(b.start));

		storePreSelectedCourses(selectedCourses, semesterLabel, dateRanges);
		goto('/schedule-review');
	}

	// @ Formatting helpers
	function formatMeetingSlots(slots: ParsedCourse['meetingSlots']): string {
		if (slots.length === 0) return 'TBD';
		const DAY_ABBR: Record<string, string> = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' };
		return slots.map((s) => `${DAY_ABBR[s.day] ?? s.day} ${s.startTime}–${s.endTime}`).join(', ');
	}

	function formatRoom(slots: ParsedCourse['meetingSlots']): string {
		const rooms = [...new Set(slots.map((s) => s.room).filter(Boolean))];
		return rooms.join(', ') || '';
	}
</script>

<div class="flex flex-col gap-6">
	<!-- @ Header -->
	<div>
		<h1 class="text-3xl font-bold">Student Schedule Setup</h1>
		<p class="text-muted-foreground mt-2">
			Select your program and semester to see available courses, then pick the ones you're enrolled in.
		</p>
	</div>

	<!-- # Data loading state -->
	{#if loadStatus === 'loading'}
		<Card class="p-8 flex items-center justify-center gap-3 text-muted-foreground">
			<LoaderIcon class="w-5 h-5 animate-spin" />
			<span>Loading course data...</span>
		</Card>
	{:else if loadStatus === 'error'}
		<Card class="p-6 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950">
			<div class="flex items-start gap-3">
				<AlertCircleIcon class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
				<div>
					<p class="font-semibold text-red-900 dark:text-red-100">Could not load course data</p>
					<p class="text-sm text-red-700 dark:text-red-300 mt-1">
						Course data has not been published yet, or there was a network error. Please try again later or contact your program administrator.
					</p>
				</div>
			</div>
		</Card>
	{:else}
		<!-- # Form errors -->
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
			<div class="space-y-8">

				<!-- / Section 1: Program -->
				<div class="space-y-4">
					<h2 class="text-lg font-semibold border-b pb-2 flex items-center gap-2">
						<GraduationCapIcon class="w-5 h-5" />
						My Program
					</h2>
					<div class="grid grid-cols-2 gap-4 max-w-sm">
						{#each ['MMS', 'FMBA'] as program}
							<button
								type="button"
								onclick={() => { selectedProgram = program as 'MMS' | 'FMBA'; selectedCourseIds = new Set(); }}
								class="flex flex-col items-center justify-center p-4 rounded-lg border-2 font-semibold transition-all
									{selectedProgram === program
										? 'border-primary bg-primary/5 text-primary'
										: 'border-muted hover:border-muted-foreground/50'}"
							>
								{program}
							</button>
						{/each}
					</div>
				</div>

				<!-- / Section 2: Semester -->
				<div class="space-y-4">
					<h2 class="text-lg font-semibold border-b pb-2 flex items-center gap-2">
						<CalendarIcon class="w-5 h-5" />
						Semester Period
					</h2>
					<p class="text-sm text-muted-foreground">
						Select the semester(s) you're enrolled in. Periods marked "Coming soon" don't have course data published yet.
					</p>

					<div class="space-y-6">
						{#each Object.entries(semestersByCategory()) as [category, semesters]}
							<div class="space-y-3">
								<h3 class="font-medium text-sm flex items-center gap-2">
									{category}
									{#if semesters.some((s) => s.tentative)}
										<span class="text-xs text-amber-600 dark:text-amber-400 font-normal">(tentative)</span>
									{/if}
								</h3>
								<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
									{#each semesters as semester}
										{@const hasData = coursesData ? semesterHasData(coursesData, semester.id) : false}
										<label
											class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
												{selectedSemesterIds.includes(semester.id)
													? 'border-primary bg-primary/5'
													: hasData
														? 'border-muted hover:border-muted-foreground/50'
														: 'border-muted opacity-60 cursor-not-allowed'}"
										>
											<Checkbox
												checked={selectedSemesterIds.includes(semester.id)}
												disabled={!hasData}
												onCheckedChange={(checked) => hasData && toggleSemester(semester.id, !!checked)}
												class="mt-0.5"
											/>
											<div class="flex-1 min-w-0">
												<div class="flex items-center gap-2">
													<span class="font-medium text-sm">{semester.label}</span>
													{#if !hasData}
														<span class="text-xs text-muted-foreground italic">Coming soon</span>
													{/if}
												</div>
												<div class="text-xs text-muted-foreground mt-0.5">{semester.description}</div>
											</div>
										</label>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- / Section 3: Course Selection -->
				{#if selectedProgram && selectedSemesterIds.length > 0}
					<div class="space-y-4">
						<h2 class="text-lg font-semibold border-b pb-2 flex items-center gap-2">
							<BookOpenIcon class="w-5 h-5" />
							My Courses
						</h2>

						{#if !anySelectedSemesterHasData}
							<p class="text-sm text-muted-foreground italic">
								No course data is available yet for the selected semester(s). Check back after your program administrator publishes the schedule.
							</p>
						{:else if filteredCourses().length === 0}
							<p class="text-sm text-muted-foreground italic">
								No {selectedProgram} courses found for the selected semester(s).
							</p>
						{:else}
							<p class="text-sm text-muted-foreground">
								Select the courses you're enrolled in for <strong>{semesterLabel}</strong>.
							</p>

							<div class="space-y-2">
								{#each filteredCourses() as course}
									{@const key = course.courseCode || course.courseTitle}
									{@const isSelected = selectedCourseIds.has(key)}
									<label
										class="flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors
											{isSelected
												? 'border-primary bg-primary/5'
												: 'border-muted hover:border-muted-foreground/50'}"
									>
										<Checkbox
											checked={isSelected}
											onCheckedChange={(checked) => toggleCourse(key, !!checked)}
											class="mt-0.5"
										/>
										<div class="flex-1 min-w-0 space-y-1">
											<div class="flex items-start justify-between gap-2">
												<div>
													<span class="font-medium">{course.courseTitle}</span>
													{#if course.courseCode}
														<span class="text-sm text-muted-foreground ml-2">({course.courseCode})</span>
													{/if}
												</div>
											</div>
											<div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
												{#if course.instructor}
													<span class="flex items-center gap-1">
														<UserIcon class="w-3.5 h-3.5" />
														{course.instructor}
													</span>
												{/if}
												{#if course.meetingSlots.length > 0}
													<span class="flex items-center gap-1">
														<ClockIcon class="w-3.5 h-3.5" />
														{formatMeetingSlots(course.meetingSlots)}
													</span>
												{/if}
												{#if formatRoom(course.meetingSlots)}
													<span class="flex items-center gap-1">
														<MapPinIcon class="w-3.5 h-3.5" />
														{formatRoom(course.meetingSlots)}
													</span>
												{/if}
											</div>
										</div>
									</label>
								{/each}
							</div>

							{#if selectedCourses.length > 0}
								<div class="bg-muted/50 rounded-lg p-3 flex items-center gap-2 text-sm">
									<CheckCircleIcon class="w-4 h-4 text-green-600 flex-shrink-0" />
									<span>{selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} selected</span>
								</div>
							{/if}
						{/if}
					</div>
				{/if}

				<!-- # Submit -->
				<div class="pt-4 border-t">
					<Button
						onclick={handleContinue}
						class="w-full"
						disabled={selectedCourses.length === 0}
					>
						Continue to Review →
					</Button>
				</div>
			</div>
		</Card>
	{/if}
</div>
