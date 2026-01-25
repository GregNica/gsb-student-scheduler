<script lang="ts">
	// @ Course setup page
	// # Purpose: Collect course metadata before scanning syllabus

	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Textarea } from '$lib/components/ui/textarea';
	import { goto } from '$app/navigation';
	import {
		getCourseData,
		saveCourseData,
		getMeetingDays,
		DEFAULT_KEYWORDS,
		type CourseData
	} from '$lib/utils/courseStorage';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';

	// @ Load existing course data or start fresh
	let courseData: CourseData = $state(getCourseData());
	let formErrors: string[] = $state([]);

	// / Handle form submission
	function handleSave() {
		// # Validate required fields
		formErrors = [];

		if (!courseData.courseName.trim()) {
			formErrors.push('Course name is required');
		}
		if (!courseData.courseNumber.trim()) {
			formErrors.push('Course number is required');
		}
		if (!courseData.semesterStart) {
			formErrors.push('Semester start date is required');
		}
		if (!courseData.semesterEnd) {
			formErrors.push('Semester end date is required');
		}

		// # Check if any meeting day selected
		const anyDaySelected = Object.values(courseData.meetingDays).some((v) => v);
		if (!anyDaySelected) {
			formErrors.push('Select at least one meeting day');
		}

		// @ Date validation for primary range
		if (courseData.semesterStart && courseData.semesterEnd) {
			if (new Date(courseData.semesterStart) >= new Date(courseData.semesterEnd)) {
				formErrors.push('Semester end date must be after start date');
			}
		}

		// @ Date validation for secondary range (if provided)
		if (courseData.semesterStart2 || courseData.semesterEnd2) {
			// If one is provided, both must be provided
			if (!courseData.semesterStart2 || !courseData.semesterEnd2) {
				formErrors.push('If using a second semester range, both start and end dates are required');
			} else if (new Date(courseData.semesterStart2) >= new Date(courseData.semesterEnd2)) {
				formErrors.push('Second semester end date must be after start date');
			} else if (new Date(courseData.semesterStart2) <= new Date(courseData.semesterEnd)) {
				formErrors.push('Second semester must start after the first semester ends (for breaks)');
			}
		}

		// / If errors exist, don't save
		if (formErrors.length > 0) {
			return;
		}

		// @ Save to localStorage and navigate
		if (saveCourseData(courseData)) {
			goto('/upload');
		} else {
			formErrors.push('Failed to save course data');
		}
	}

	// / Toggle all meeting days
	function toggleAllDays(value: boolean) {
		courseData.meetingDays.monday = value;
		courseData.meetingDays.tuesday = value;
		courseData.meetingDays.wednesday = value;
		courseData.meetingDays.thursday = value;
		courseData.meetingDays.friday = value;
		courseData.meetingDays.saturday = value;
		courseData.meetingDays.sunday = value;
	}
</script>

<!-- @ Page title and description -->
<div class="flex flex-col gap-6">
	<div>
		<h1 class="text-3xl font-bold">Course Setup</h1>
		<p class="text-muted-foreground mt-2">
			Tell us about your course so we can better identify assignments and deadlines in your syllabus
		</p>
	</div>

	<!-- # Error message display -->
	{#if formErrors.length > 0}
		<div class="flex items-start gap-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
			<AlertCircleIcon class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
			<div>
				<p class="font-semibold text-red-900 dark:text-red-100">Please fix the following errors:</p>
				<ul class="text-sm text-red-800 dark:text-red-200 mt-2 space-y-1">
					{#each formErrors as error}
						<li>• {error}</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}

	<!-- # Main form card -->
	<Card class="p-8">
		<form on:submit|preventDefault={handleSave} class="space-y-8">
			<!-- / Section 1: Course Information -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold border-b pb-2">Course Information</h2>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="courseName">Course Name</Label>
						<Input
							id="courseName"
							bind:value={courseData.courseName}
							placeholder="e.g., Introduction to Psychology"
							type="text"
						/>
					</div>

					<div class="space-y-2">
						<Label for="courseNumber">Course Number</Label>
						<Input
							id="courseNumber"
							bind:value={courseData.courseNumber}
							placeholder="e.g., PSY 101"
							type="text"
						/>
					</div>
				</div>
			</div>

			<!-- / Section 2: Assignment Keywords -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold border-b pb-2">Assignment Keywords</h2>

				<!-- # Info about pre-searched keywords -->
				<div class="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
					<p class="text-sm font-semibold text-blue-900 dark:text-blue-100">
						The app will automatically search for these keywords:
					</p>
					<div class="flex flex-wrap gap-2">
						{#each DEFAULT_KEYWORDS as keyword}
							<span class="inline-block bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100 px-3 py-1 rounded-full text-sm">
								{keyword}
							</span>
						{/each}
					</div>
				</div>

				<!-- @ Custom keywords field -->
				<div class="space-y-2">
					<Label for="otherKeywords">Additional Keywords (Optional)</Label>
					<p class="text-xs text-muted-foreground mb-2">
						Enter any additional keywords you'd like us to search for. Separate multiple keywords with commas. For example: <em>midterm, final exam, discussion post</em>
					</p>
					<Textarea
						id="otherKeywords"
						bind:value={courseData.otherKeywords}
						placeholder="Add custom keywords separated by commas&#10;Example: exam, reflection paper, discussion post"
						rows={3}
					/>
				</div>

				<!-- @ Future assignments note -->
				<div class="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
					<div class="flex items-start gap-3">
						<div class="flex items-center gap-2 flex-1 mt-0.5">
							<Checkbox
								id="hasFutureAssignments"
								bind:checked={courseData.hasFutureAssignments}
							/>
							<div class="flex flex-col gap-1 flex-1">
								<Label for="hasFutureAssignments" class="font-medium cursor-pointer text-amber-900 dark:text-amber-100">
									Some assignments may be posted later (not yet assigned)
								</Label>
								<p class="text-xs text-amber-700 dark:text-amber-300">
									Check this if your syllabus mentions assignments that haven't been given due dates yet, or assignments that may be announced later in the semester.
								</p>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- / Section 3: Semester Dates -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold border-b pb-2">Semester Dates</h2>

				<div class="space-y-4">
					<!-- # Primary semester range -->
					<div class="space-y-2">
						<Label class="font-medium">Primary Semester Range</Label>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="semesterStart">Start Date</Label>
								<Input
									id="semesterStart"
									bind:value={courseData.semesterStart}
									type="date"
								/>
							</div>

							<div class="space-y-2">
								<Label for="semesterEnd">End Date</Label>
								<Input
									id="semesterEnd"
									bind:value={courseData.semesterEnd}
									type="date"
								/>
							</div>
						</div>
					</div>

					<!-- @ Optional second semester range (for holidays/breaks) -->
					<div class="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
						<div class="space-y-2">
							<Label class="font-medium text-blue-900 dark:text-blue-100">
								Second Semester Range (Optional - for holidays/breaks)
							</Label>
							<p class="text-xs text-blue-700 dark:text-blue-300">
								If your semester has a holiday break in the middle (e.g., Winter/Spring break), add the dates for the second portion here. This helps the app accurately assign week/session numbers to dates.
							</p>
						</div>
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="semesterStart2">Resume Date (after break)</Label>
								<Input
									id="semesterStart2"
									bind:value={courseData.semesterStart2}
									type="date"
									placeholder="e.g., March 20"
								/>
							</div>

							<div class="space-y-2">
								<Label for="semesterEnd2">Final End Date</Label>
								<Input
									id="semesterEnd2"
									bind:value={courseData.semesterEnd2}
									type="date"
									placeholder="e.g., May 15"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- / Section 4: Meeting Schedule -->
			<div class="space-y-4">
				<div class="flex items-center justify-between border-b pb-2">
					<h2 class="text-lg font-semibold">Class Meeting Schedule</h2>
					<div class="flex gap-2 text-sm">
						<button
							type="button"
							on:click={() => toggleAllDays(true)}
							class="text-blue-600 hover:underline"
						>
							Select All
						</button>
						<span class="text-muted-foreground">/</span>
						<button
							type="button"
							on:click={() => toggleAllDays(false)}
							class="text-blue-600 hover:underline"
						>
							Clear All
						</button>
					</div>
				</div>

				<div class="space-y-3">
					<div class="space-y-2">
						<Label>Days of the Week</Label>
						<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
							<div class="flex items-center gap-2">
								<Checkbox
									id="monday"
									bind:checked={courseData.meetingDays.monday}
								/>
								<Label for="monday" class="font-normal cursor-pointer">Monday</Label>
							</div>

							<div class="flex items-center gap-2">
								<Checkbox
									id="tuesday"
									bind:checked={courseData.meetingDays.tuesday}
								/>
								<Label for="tuesday" class="font-normal cursor-pointer">Tuesday</Label>
							</div>

							<div class="flex items-center gap-2">
								<Checkbox
									id="wednesday"
									bind:checked={courseData.meetingDays.wednesday}
								/>
								<Label for="wednesday" class="font-normal cursor-pointer">Wednesday</Label>
							</div>

							<div class="flex items-center gap-2">
								<Checkbox
									id="thursday"
									bind:checked={courseData.meetingDays.thursday}
								/>
								<Label for="thursday" class="font-normal cursor-pointer">Thursday</Label>
							</div>

							<div class="flex items-center gap-2">
								<Checkbox
									id="friday"
									bind:checked={courseData.meetingDays.friday}
								/>
								<Label for="friday" class="font-normal cursor-pointer">Friday</Label>
							</div>

							<div class="flex items-center gap-2">
								<Checkbox
									id="saturday"
									bind:checked={courseData.meetingDays.saturday}
								/>
								<Label for="saturday" class="font-normal cursor-pointer">Saturday</Label>
							</div>

							<div class="flex items-center gap-2">
								<Checkbox
									id="sunday"
									bind:checked={courseData.meetingDays.sunday}
								/>
								<Label for="sunday" class="font-normal cursor-pointer">Sunday</Label>
							</div>
						</div>
					</div>

					<div class="space-y-2">
						<Label for="meetingTime">Class Meeting Time</Label>
						<Input
							id="meetingTime"
							bind:value={courseData.meetingTime}
							type="time"
						/>
					</div>
				</div>
			</div>

			<!-- # Form actions -->
			<div class="flex gap-3 pt-4 border-t">
				<Button type="submit" variant="default" class="flex-1">
					Save & Continue to Upload
				</Button>
				<Button type="button" variant="outline">
					Cancel
				</Button>
			</div>
		</form>
	</Card>

	<!-- # Help section -->
	<Card class="p-6 bg-muted/50">
		<h3 class="font-semibold mb-3">Why we need this information</h3>
		<ul class="text-sm space-y-2 text-muted-foreground">
			<li>
				<strong>Assignment Types:</strong> We'll search your syllabus for these specific keywords to find deadlines
			</li>
			<li>
				<strong>Semester Dates:</strong> We'll ignore dates outside your semester to avoid false matches
			</li>
			<li>
				<strong>Meeting Days & Time:</strong> We'll use this to validate found dates and catch errors
			</li>
			<li>
				<strong>Future Assignments:</strong> Lets us know to look for assignments that may not have dates yet
			</li>
		</ul>
	</Card>
</div>
