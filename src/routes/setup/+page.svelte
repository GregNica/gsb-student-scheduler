<script lang="ts">
	// @ Course Schedule Setup page
	// # Purpose: Upload a standardized Excel file containing the student's course schedule

	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Input } from '$lib/components/ui/input';
	import { goto } from '$app/navigation';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import LoaderIcon from '@lucide/svelte/icons/loader';
	import FileSpreadsheetIcon from '@lucide/svelte/icons/file-spreadsheet';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import InfoIcon from '@lucide/svelte/icons/info';
	import XIcon from '@lucide/svelte/icons/x';
	import { scanSchedule } from '$lib/utils/scheduleScannerMain';
	import { storeScheduleScanResults } from '$lib/utils/scheduleReviewStorage';

	// @ State
	let semesterLabel = $state('');
	let semesterStart = $state('');
	let semesterEnd = $state('');
	let semesterStart2 = $state('');
	let semesterEnd2 = $state('');
	let uploadedFile: File | null = $state(null);
	let uploadStatus: 'idle' | 'success' | 'error' | 'scanning' = $state('idle');
	let errorMessage = $state('');
	let formErrors: string[] = $state([]);
	let isDragging = $state(false);
	let scanProgress = $state('');

	// @ Allowed file types (Excel only)
	const ALLOWED_FILE_TYPES = [
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	];
	const ALLOWED_EXTENSIONS = ['.xls', '.xlsx'];

	// / Validate and accept an Excel file
	function acceptFile(file: File) {
		const isValidType =
			ALLOWED_FILE_TYPES.includes(file.type) ||
			ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

		if (!isValidType) {
			uploadStatus = 'error';
			errorMessage = 'Please upload an Excel file (.xls or .xlsx)';
			uploadedFile = null;
			return;
		}

		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			uploadStatus = 'error';
			errorMessage = 'File is too large. Maximum size is 10MB.';
			uploadedFile = null;
			return;
		}

		uploadedFile = file;
		uploadStatus = 'success';
		errorMessage = '';
	}

	// / Handle file input change
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = target.files;
		if (!files || files.length === 0) return;
		acceptFile(files[0]);
	}

	// / Handle drag events
	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragging = true;
	}

	function handleDragLeave() {
		isDragging = false;
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragging = false;
		const files = event.dataTransfer?.files;
		if (!files || files.length === 0) return;
		acceptFile(files[0]);
	}

	// / Remove the selected file
	function removeFile() {
		uploadedFile = null;
		uploadStatus = 'idle';
		errorMessage = '';
		const input = document.querySelector('#schedule-upload') as HTMLInputElement;
		if (input) input.value = '';
	}

	// / Handle form submission — run scanner, store results, navigate to review
	async function handleContinue() {
		formErrors = [];

		if (!semesterLabel.trim()) {
			formErrors.push('Semester label is required (e.g., "Spring 2026")');
		}

		if (!semesterStart) {
			formErrors.push('Semester start date is required');
		}

		if (!semesterEnd) {
			formErrors.push('Semester end date is required');
		}

		if (semesterStart && semesterEnd && semesterStart >= semesterEnd) {
			formErrors.push('Semester end date must be after start date');
		}

		// @ Date validation for secondary range (if provided)
		if (semesterStart2 || semesterEnd2) {
			if (!semesterStart2 || !semesterEnd2) {
				formErrors.push('If using a second semester range, both start and end dates are required');
			} else if (semesterStart2 >= semesterEnd2) {
				formErrors.push('Second semester end date must be after start date');
			} else if (semesterStart2 <= semesterEnd) {
				formErrors.push('Second semester must start after the first semester ends (for breaks)');
			}
		}

		if (!uploadedFile) {
			formErrors.push('Please upload your course schedule Excel file');
		}

		if (formErrors.length > 0) return;

		// @ Run the scanner
		uploadStatus = 'scanning';
		scanProgress = 'Reading Excel file...';

		try {
			scanProgress = 'Scanning schedule...';
			const result = await scanSchedule(uploadedFile!);

			if (!result || result.courses.length === 0) {
				throw new Error('No courses found in the uploaded file');
			}

			scanProgress = 'Storing results...';
			if (!storeScheduleScanResults(result, semesterLabel.trim(), semesterStart, semesterEnd, semesterStart2, semesterEnd2)) {
				throw new Error('Failed to store scan results');
			}

			scanProgress = 'Done! Redirecting...';
			await new Promise((resolve) => setTimeout(resolve, 400));

			goto('/schedule-review');
		} catch (error) {
			uploadStatus = 'error';
			errorMessage = error instanceof Error ? error.message : 'Scan failed';
			scanProgress = '';
		}
	}
</script>

<div class="flex flex-col gap-6">
	<!-- @ Page header -->
	<div>
		<h1 class="text-3xl font-bold">Course Schedule Setup</h1>
		<p class="text-muted-foreground mt-2">
			Upload your course schedule to extract class times and generate calendar reminders
		</p>
	</div>

	<!-- # Info card -->
	<Card class="p-6 bg-muted/50">
		<div class="flex items-start gap-3">
			<InfoIcon class="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
			<div class="space-y-2">
				<h3 class="font-semibold">How this works</h3>
				<ul class="text-sm space-y-2 text-muted-foreground">
					<li>
						<strong>Upload</strong> — Provide your course schedule as an Excel file following SKKU's standard format (.xls or .xlsx). See below for instructions on how to extract this Excel file from GLS in the standardized format.
					</li>
					<li>
						<strong>Review</strong> — We'll extract your courses, meeting times, and locations so you can verify everything looks correct.
					</li>
					<li>
						<strong>Generate</strong> — Once confirmed, we'll create calendar reminder events for each class session throughout the semester. The app will generate a .ics file for you to download and then upload into your preferred calendar app.
					</li>
				</ul>
			</div>
		</div>
	</Card>

	<!-- # Error messages -->
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

	<!-- # Main card -->
	<Card class="p-8">
		<form onsubmit={(e) => { e.preventDefault(); handleContinue(); }} class="space-y-8">

			<!-- / Section 1: Semester Info -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold border-b pb-2 flex items-center gap-2">
					<CalendarIcon class="w-5 h-5" />
					Semester Information
				</h2>

				<div class="max-w-md space-y-2">
					<Label for="semesterLabel">Semester</Label>
					<Input
						id="semesterLabel"
						bind:value={semesterLabel}
						placeholder="e.g., Spring 2026"
						type="text"
					/>
					<p class="text-xs text-muted-foreground">
						A label for this schedule (used for organizing your calendar events)
					</p>
				</div>

				<div class="space-y-2">
					<Label class="font-medium">Primary Semester Range</Label>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="semesterStart">Start Date</Label>
							<Input
								id="semesterStart"
								bind:value={semesterStart}
								type="date"
							/>
							<p class="text-xs text-muted-foreground">
								First day of classes
							</p>
						</div>
						<div class="space-y-2">
							<Label for="semesterEnd">End Date</Label>
							<Input
								id="semesterEnd"
								bind:value={semesterEnd}
								type="date"
							/>
							<p class="text-xs text-muted-foreground">
								Last day of classes (or before break)
							</p>
						</div>
					</div>
				</div>

				<!-- @ Optional second semester range (for holidays/breaks) -->
				<div class="space-y-2">
					<Label class="font-medium">
						Second Semester Range
						<span class="text-muted-foreground font-normal ml-1">(Optional)</span>
					</Label>
					<p class="text-xs text-muted-foreground">
						If your semester has a holiday break in the middle (e.g., Winter/Spring break), add the dates for the second portion here. This ensures recurring calendar events are created correctly.
					</p>
					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div class="space-y-2">
							<Label for="semesterStart2">Resume Date (after break)</Label>
							<Input
								id="semesterStart2"
								bind:value={semesterStart2}
								type="date"
							/>
						</div>
						<div class="space-y-2">
							<Label for="semesterEnd2">Final End Date</Label>
							<Input
								id="semesterEnd2"
								bind:value={semesterEnd2}
								type="date"
							/>
						</div>
					</div>
				</div>
			</div>

			<!-- / Section 2: File Upload -->
			<div class="space-y-4">
				<h2 class="text-lg font-semibold border-b pb-2 flex items-center gap-2">
					<FileSpreadsheetIcon class="w-5 h-5" />
					Upload Schedule
				</h2>

				<!-- @ Drop zone -->
				{#if !uploadedFile}
					<div
						class="border-2 border-dashed rounded-lg p-10 text-center transition-colors cursor-pointer
							{isDragging
								? 'border-primary bg-primary/5'
								: 'border-muted-foreground/25 hover:border-muted-foreground/50'}"
						role="button"
						tabindex="0"
						ondragover={handleDragOver}
						ondragleave={handleDragLeave}
						ondrop={handleDrop}
						onclick={() => document.getElementById('schedule-upload')?.click()}
						onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('schedule-upload')?.click(); }}
					>
						<input
							type="file"
							class="hidden"
							id="schedule-upload"
							accept=".xls,.xlsx"
							onchange={handleFileSelect}
							aria-label="Upload course schedule Excel file"
						/>

						<div class="flex flex-col items-center gap-3">
							<div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
								<UploadIcon class="w-8 h-8 text-muted-foreground" />
							</div>
							<div>
								<p class="font-semibold">Click to upload or drag and drop</p>
								<p class="text-sm text-muted-foreground mt-1">Excel files only (.xls, .xlsx)</p>
							</div>
						</div>
					</div>
				{:else}
					<!-- @ File selected state -->
					<div class="flex items-center gap-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
						<div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center flex-shrink-0">
							<FileSpreadsheetIcon class="w-5 h-5 text-green-700 dark:text-green-300" />
						</div>
						<div class="flex-1 min-w-0">
							<p class="font-medium text-green-900 dark:text-green-100 truncate">{uploadedFile.name}</p>
							<p class="text-sm text-green-700 dark:text-green-300">
								{(uploadedFile.size / 1024).toFixed(1)} KB
							</p>
						</div>
						<Button variant="ghost" size="sm" onclick={removeFile} class="text-green-700 dark:text-green-300 hover:text-red-600">
							<XIcon class="w-4 h-4" />
						</Button>
					</div>
				{/if}

				<!-- @ Upload error -->
				{#if uploadStatus === 'error'}
					<div class="flex items-start gap-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
						<AlertCircleIcon class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
						<p class="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
					</div>
				{/if}
			</div>

			<!-- @ Scanning progress -->
			{#if uploadStatus === 'scanning'}
				<div class="flex items-center gap-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
					<LoaderIcon class="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
					<p class="text-sm text-blue-800 dark:text-blue-200">{scanProgress}</p>
				</div>
			{/if}

			<!-- # Submit -->
			<div class="flex gap-3 pt-4 border-t">
				<Button type="submit" variant="default" class="flex-1" disabled={uploadStatus === 'scanning'}>
					{#if uploadStatus === 'scanning'}
						<LoaderIcon class="w-4 h-4 mr-2 animate-spin" />
						Scanning...
					{:else}
						Continue to Review
					{/if}
				</Button>
			</div>
		</form>
	</Card>

	<!-- # Export instructions -->
	<Card class="p-6">
		<div class="space-y-4">
			<h3 class="font-semibold text-lg">How to Export from GLS</h3>
			<p class="text-sm text-muted-foreground">
				Follow these steps to download your course schedule from the SKKU GLS portal:
			</p>

			<div class="space-y-6">
				<!-- Step 1 -->
				<div class="space-y-2">
					<p class="text-sm font-medium">
						<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">1</span>
						GLS &gt; Courses &gt; Graduate Registration &gt; Weekly Timetable
					</p>
					<img
						src="/instructions/step-1-weekly-timetable.png"
						alt="Navigate to Weekly Timetable in GLS"
						class="rounded-lg border shadow-sm max-w-full"
					/>
				</div>

				<!-- Step 2 -->
				<div class="space-y-2">
					<p class="text-sm font-medium">
						<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">2</span>
						Module (GSB) Dropdown &gt; Current Semester (i.e. MP3)
					</p>
					<img
						src="/instructions/step-2-module-dropdown.png"
						alt="Select module and semester from dropdown"
						class="rounded-lg border shadow-sm max-w-full"
					/>
				</div>

				<!-- Step 3 -->
				<div class="space-y-2">
					<p class="text-sm font-medium">
						<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">3</span>
						It will automatically pop up with a print option. Close this window.
					</p>
					<img
						src="/instructions/step-3-print-popup.png"
						alt="Close the print popup window"
						class="rounded-lg border shadow-sm max-w-full"
					/>
				</div>

				<!-- Step 4 -->
				<div class="space-y-2">
					<p class="text-sm font-medium">
						<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">4</span>
						In the table, hover over the "Module (GSB)" cell (not the dropdown) and click the Filter symbol button. Here type the semester label after the = sign (i.e. MP3). This is case sensitive. This prevents other semesters from showing (i.e. IW2), which happens sometimes for intensive weeks and confuses the system.
					</p>
					<img
						src="/instructions/step-4-filter-module.png"
						alt="Filter by module to show only current semester courses"
						class="rounded-lg border shadow-sm max-w-full"
					/>
				</div>

				<!-- Step 5 -->
				<div class="space-y-2">
					<p class="text-sm font-medium">
						<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs mr-2">5</span>
						After clicking "application" you should only see the courses you registered for in the selected term. Now hover back over anywhere on the table and right click. You should get a white box with four options. Select "Download Excel"
					</p>
					<img
						src="/instructions/step-5-download-excel.png"
						alt="Right click and select Download Excel"
						class="rounded-lg border shadow-sm max-w-full"
					/>
				</div>
			</div>
		</div>
	</Card>
</div>
