<script lang="ts">
	// @ Schedule review page
	// # Purpose: Let students review, edit, delete, and add courses parsed from their schedule
	// # Borrows layout and interaction patterns from /review page

	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import PencilIcon from '@lucide/svelte/icons/pencil';
	import PlusIcon from '@lucide/svelte/icons/plus';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import BookOpenIcon from '@lucide/svelte/icons/book-open';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import MapPinIcon from '@lucide/svelte/icons/map-pin';
	import UserIcon from '@lucide/svelte/icons/user';
	import { goto } from '$app/navigation';
	import {
		getScheduleReviewSession,
		deleteCourseFromReview,
		clearScheduleReviewSession,
		addNewCourseToReview,
		updateCourseInReview,
		getScheduleReviewStats,
		type ScheduleReviewSession,
		type ReviewedCourse,
	} from '$lib/utils/scheduleReviewStorage';
	import type { MeetingSlot } from '$lib/utils/scheduleParser';

	// @ All 7 days for checkboxes
	const ALL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
	const DAY_ABBR: Record<string, string> = {
		Monday: 'Mon',
		Tuesday: 'Tue',
		Wednesday: 'Wed',
		Thursday: 'Thu',
		Friday: 'Fri',
		Saturday: 'Sat',
		Sunday: 'Sun',
	};

	// @ State
	let session: ScheduleReviewSession | null = $state(getScheduleReviewSession());
	let showAddForm = $state(false);

	// / Editable local copy of courses (so we can bind to inputs)
	let courses: ReviewedCourse[] = $state(session ? session.courses.map((c) => ({ ...c })) : []);

	// / Track which course card is expanded for editing
	let editingCourseId: string | null = $state(null);

	// / New course form state
	let newCourse = $state({
		courseTitle: '',
		courseCode: '',
		instructor: '',
		room: '',
		startTime: '',
		endTime: '',
		days: {
			Monday: false,
			Tuesday: false,
			Wednesday: false,
			Thursday: false,
			Friday: false,
			Saturday: false,
			Sunday: false,
		} as Record<string, boolean>,
	});

	// # Redirect if no session
	$effect(() => {
		if (!session) {
			goto('/setup');
		}
	});

	// / Derived stats
	let stats = $derived(session ? getScheduleReviewStats({ ...session, courses }) : null);

	// / Format meeting slots as a readable string for display
	function formatMeetingSlots(slots: MeetingSlot[]): string {
		if (slots.length === 0) return 'No meeting times';
		return slots
			.map((s) => `${DAY_ABBR[s.day] || s.day} ${s.startTime}–${s.endTime}`)
			.join(', ');
	}

	// / Format rooms from slots (deduplicated)
	function formatRooms(slots: MeetingSlot[]): string {
		const rooms = [...new Set(slots.map((s) => s.room).filter((r) => r))];
		if (rooms.length === 0) return 'No room assigned';
		return rooms.join(', ');
	}

	// / Get the days a course meets (from its slots)
	function getCourseDays(course: ReviewedCourse): Record<string, boolean> {
		const days: Record<string, boolean> = {};
		for (const d of ALL_DAYS) {
			days[d] = course.meetingSlots.some((s) => s.day === d);
		}
		return days;
	}

	// / Get time string from first slot (all slots for a course typically share the same time)
	function getCourseTime(course: ReviewedCourse): { start: string; end: string } {
		if (course.meetingSlots.length === 0) return { start: '', end: '' };
		return { start: course.meetingSlots[0].startTime, end: course.meetingSlots[0].endTime };
	}

	// / Get room from first slot
	function getCourseRoom(course: ReviewedCourse): string {
		if (course.meetingSlots.length === 0) return '';
		const rooms = [...new Set(course.meetingSlots.map((s) => s.room).filter((r) => r))];
		return rooms.join(', ');
	}

	// / Save edits to a course back into session storage
	function saveCourseEdits(courseId: string) {
		const course = courses.find((c) => c.id === courseId);
		if (!course) return;
		updateCourseInReview(courseId, course);
		editingCourseId = null;
	}

	// / Update meeting slots when days or time changes
	function updateMeetingSlots(
		course: ReviewedCourse,
		days: Record<string, boolean>,
		startTime: string,
		endTime: string,
		room: string
	) {
		const newSlots: MeetingSlot[] = [];
		for (const day of ALL_DAYS) {
			if (days[day]) {
				newSlots.push({
					day,
					dayCode: DAY_ABBR[day] || day,
					startTime,
					endTime,
					room,
				});
			}
		}
		course.meetingSlots = newSlots;
	}

	// / Delete a course
	function handleDelete(courseId: string) {
		if (confirm('Are you sure you want to remove this course?')) {
			deleteCourseFromReview(courseId);
			courses = courses.filter((c) => c.id !== courseId);
			if (editingCourseId === courseId) editingCourseId = null;
		}
	}

	// / Add a new course manually
	function handleAddCourse() {
		if (!newCourse.courseTitle.trim()) {
			alert('Please enter a course title');
			return;
		}

		const selectedDays = Object.entries(newCourse.days)
			.filter(([_, v]) => v)
			.map(([d]) => d);

		const meetingSlots: MeetingSlot[] = selectedDays.map((day) => ({
			day,
			dayCode: DAY_ABBR[day] || day,
			startTime: newCourse.startTime,
			endTime: newCourse.endTime,
			room: newCourse.room,
		}));

		const courseToAdd: Omit<ReviewedCourse, 'id'> = {
			courseCode: newCourse.courseCode,
			courseTitle: newCourse.courseTitle,
			instructor: newCourse.instructor,
			credits: '',
			campus: '',
			meetingSlots,
			confidence: 'high',
			reasons: ['Manually added by user'],
			sourceRows: [0, 0, 0],
			rawTimeRoom: '',
		};

		if (addNewCourseToReview(courseToAdd)) {
			// Refresh from storage
			const updated = getScheduleReviewSession();
			if (updated) {
				courses = updated.courses.map((c) => ({ ...c }));
			}

			// Reset form
			newCourse = {
				courseTitle: '',
				courseCode: '',
				instructor: '',
				room: '',
				startTime: '',
				endTime: '',
				days: {
					Monday: false,
					Tuesday: false,
					Wednesday: false,
					Thursday: false,
					Friday: false,
					Saturday: false,
					Sunday: false,
				},
			};
			showAddForm = false;
		}
	}

	// / Navigation
	function handleGoBack() {
		clearScheduleReviewSession();
		goto('/setup');
	}

	function handleConfirm() {
		// Save final state before proceeding
		if (session) {
			for (const course of courses) {
				updateCourseInReview(course.id, course);
			}
		}
		goto('/calendar-download');
	}
</script>

<div class="flex flex-col gap-6">
	{#if session}
		<!-- @ Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold">Review Schedule</h1>
				<p class="text-muted-foreground mt-2">
					{session.semesterLabel ? session.semesterLabel + ' — ' : ''}{courses.length} course{courses.length !== 1 ? 's' : ''} found
				</p>
			</div>
			<Button onclick={handleGoBack} variant="outline">← Back to Setup</Button>
		</div>

		<!-- # Stats row -->
		{#if stats}
			<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card class="p-4">
					<div class="text-sm text-muted-foreground">Courses</div>
					<div class="text-2xl font-bold">{stats.totalCourses}</div>
				</Card>
				<Card class="p-4">
					<div class="text-sm text-muted-foreground">Weekly Meetings</div>
					<div class="text-2xl font-bold">{stats.totalMeetings}</div>
				</Card>
				<Card class="p-4 border-green-200 dark:border-green-800">
					<div class="text-sm text-green-600 dark:text-green-400">High Confidence</div>
					<div class="text-2xl font-bold text-green-600 dark:text-green-400">{stats.highConfidence}</div>
				</Card>
				<Card class="p-4 border-yellow-200 dark:border-yellow-800">
					<div class="text-sm text-yellow-600 dark:text-yellow-400">Needs Review</div>
					<div class="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.mediumConfidence + stats.lowConfidence}</div>
				</Card>
			</div>
		{/if}

		<!-- @ Course cards -->
		<div class="space-y-4">
			{#each courses as course, idx (course.id)}
				{@const isEditing = editingCourseId === course.id}
				{@const courseDays = getCourseDays(course)}
				{@const courseTime = getCourseTime(course)}
				{@const courseRoom = getCourseRoom(course)}

				<Card class="overflow-hidden">
					<!-- # Course header bar -->
					<div class="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
						<div class="flex items-center gap-3 min-w-0">
							<div class="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
								{idx + 1}
							</div>
							{#if isEditing}
								<Input
									bind:value={course.courseTitle}
									class="text-lg font-semibold max-w-md"
								/>
							{:else}
								<h3 class="text-lg font-semibold truncate">{course.courseTitle || 'Untitled Course'}</h3>
							{/if}

							<!-- Confidence badge -->
							<span class="text-xs px-2 py-0.5 rounded-full flex-shrink-0 {
								course.confidence === 'high'
									? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
									: course.confidence === 'medium'
										? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
										: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
							}">
								{course.confidence}
							</span>
						</div>

						<div class="flex items-center gap-2 flex-shrink-0">
							{#if isEditing}
								<Button variant="default" size="sm" onclick={() => saveCourseEdits(course.id)}>
									<CheckCircleIcon class="w-4 h-4 mr-1" />
									Save
								</Button>
								<Button variant="outline" size="sm" onclick={() => (editingCourseId = null)}>
									Cancel
								</Button>
							{:else}
								<Button variant="ghost" size="sm" onclick={() => (editingCourseId = course.id)}>
									<PencilIcon class="w-4 h-4" />
								</Button>
							{/if}
							<Button
								variant="ghost"
								size="sm"
								class="text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
								onclick={() => handleDelete(course.id)}
							>
								<TrashIcon class="w-4 h-4" />
							</Button>
						</div>
					</div>

					<!-- # Course details -->
					<div class="px-6 py-4 space-y-4">
						{#if isEditing}
							<!-- @ Editing mode -->
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="space-y-2">
									<Label>Course Code</Label>
									<Input bind:value={course.courseCode} placeholder="e.g., GSB5191-01" />
								</div>
								<div class="space-y-2">
									<Label>Instructor</Label>
									<Input bind:value={course.instructor} placeholder="e.g., JOHN SMITH" />
								</div>
							</div>

							<!-- @ Day checkboxes -->
							<div class="space-y-2">
								<Label>Meeting Days</Label>
								<div class="flex flex-wrap gap-3">
									{#each ALL_DAYS as day}
										{@const isChecked = courseDays[day]}
										<label class="flex items-center gap-2 cursor-pointer">
											<Checkbox
												checked={isChecked}
												onCheckedChange={(checked) => {
													const newDays = { ...courseDays, [day]: !!checked };
													updateMeetingSlots(course, newDays, courseTime.start, courseTime.end, courseRoom);
												}}
											/>
											<span class="text-sm">{DAY_ABBR[day]}</span>
										</label>
									{/each}
								</div>
							</div>

							<!-- @ Time and room -->
							<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
								<div class="space-y-2">
									<Label>Start Time</Label>
									<Input
										type="time"
										value={courseTime.start}
										onchange={(e) => {
											updateMeetingSlots(course, courseDays, e.currentTarget.value, courseTime.end, courseRoom);
										}}
									/>
								</div>
								<div class="space-y-2">
									<Label>End Time</Label>
									<Input
										type="time"
										value={courseTime.end}
										onchange={(e) => {
											updateMeetingSlots(course, courseDays, courseTime.start, e.currentTarget.value, courseRoom);
										}}
									/>
								</div>
								<div class="space-y-2">
									<Label>Classroom</Label>
									<Input
										value={courseRoom}
										placeholder="e.g., 9B113"
										onchange={(e) => {
											updateMeetingSlots(course, courseDays, courseTime.start, courseTime.end, e.currentTarget.value);
										}}
									/>
								</div>
							</div>
						{:else}
							<!-- @ Display mode -->
							<div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
								<div class="flex items-center gap-2 text-sm">
									<BookOpenIcon class="w-4 h-4 text-muted-foreground flex-shrink-0" />
									<span class="text-muted-foreground">Code:</span>
									<span class="font-medium">{course.courseCode || '—'}</span>
								</div>
								<div class="flex items-center gap-2 text-sm">
									<UserIcon class="w-4 h-4 text-muted-foreground flex-shrink-0" />
									<span class="text-muted-foreground">Instructor:</span>
									<span class="font-medium">{course.instructor || '—'}</span>
								</div>
								<div class="flex items-center gap-2 text-sm">
									<ClockIcon class="w-4 h-4 text-muted-foreground flex-shrink-0" />
									<span class="text-muted-foreground">Time:</span>
									<span class="font-medium">{formatMeetingSlots(course.meetingSlots)}</span>
								</div>
								<div class="flex items-center gap-2 text-sm">
									<MapPinIcon class="w-4 h-4 text-muted-foreground flex-shrink-0" />
									<span class="text-muted-foreground">Room:</span>
									<span class="font-medium">{formatRooms(course.meetingSlots)}</span>
								</div>
							</div>

							<!-- @ Day pills -->
							<div class="flex flex-wrap gap-2 pt-1">
								{#each ALL_DAYS as day}
									{@const active = courseDays[day]}
									<span class="text-xs px-2.5 py-1 rounded-full font-medium {
										active
											? 'bg-primary/10 text-primary'
											: 'bg-muted text-muted-foreground/40'
									}">
										{DAY_ABBR[day]}
									</span>
								{/each}
							</div>
						{/if}
					</div>
				</Card>
			{/each}
		</div>

		<!-- @ Add new course section -->
		<Card class="p-6">
			<div class="flex items-center justify-between mb-4">
				<h2 class="text-xl font-semibold">Add Course</h2>
				<Button
					onclick={() => (showAddForm = !showAddForm)}
					variant="outline"
					size="sm"
				>
					{#if showAddForm}
						Cancel
					{:else}
						<PlusIcon class="w-4 h-4 mr-1" />
						Add
					{/if}
				</Button>
			</div>

			{#if showAddForm}
				<div class="space-y-4">
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="newTitle">Course Title</Label>
							<Input
								id="newTitle"
								bind:value={newCourse.courseTitle}
								placeholder="e.g., Introduction to Psychology"
							/>
						</div>
						<div class="space-y-2">
							<Label for="newCode">Course Code</Label>
							<Input
								id="newCode"
								bind:value={newCourse.courseCode}
								placeholder="e.g., GSB5191-01"
							/>
						</div>
						<div class="space-y-2">
							<Label for="newInstructor">Instructor</Label>
							<Input
								id="newInstructor"
								bind:value={newCourse.instructor}
								placeholder="e.g., JOHN SMITH"
							/>
						</div>
						<div class="space-y-2">
							<Label for="newRoom">Classroom</Label>
							<Input
								id="newRoom"
								bind:value={newCourse.room}
								placeholder="e.g., 9B113"
							/>
						</div>
					</div>

					<!-- @ Day checkboxes -->
					<div class="space-y-2">
						<Label>Meeting Days</Label>
						<div class="flex flex-wrap gap-3">
							{#each ALL_DAYS as day}
								<label class="flex items-center gap-2 cursor-pointer">
									<Checkbox
										checked={newCourse.days[day]}
										onCheckedChange={(checked) => {
											newCourse.days[day] = !!checked;
										}}
									/>
									<span class="text-sm">{DAY_ABBR[day]}</span>
								</label>
							{/each}
						</div>
					</div>

					<!-- @ Time -->
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="newStartTime">Start Time</Label>
							<Input
								id="newStartTime"
								type="time"
								bind:value={newCourse.startTime}
							/>
						</div>
						<div class="space-y-2">
							<Label for="newEndTime">End Time</Label>
							<Input
								id="newEndTime"
								type="time"
								bind:value={newCourse.endTime}
							/>
						</div>
					</div>

					<Button onclick={handleAddCourse} class="w-full">
						Add Course
					</Button>
				</div>
			{/if}
		</Card>

		<!-- @ Action buttons -->
		<div class="flex gap-4 justify-between">
			<Button onclick={handleGoBack} variant="outline">Back to Setup</Button>
			<Button onclick={handleConfirm} class="bg-green-600 hover:bg-green-700 text-white">
				Confirm & Generate Calendar →
			</Button>
		</div>
	{/if}
</div>
