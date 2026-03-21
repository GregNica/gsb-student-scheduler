<script lang="ts">
	// @ Course Schedule Setup page
	// # Purpose: Upload a standardized Excel file containing the student's course schedule

	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { goto } from '$lib/utils/navigation';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import LoaderIcon from '@lucide/svelte/icons/loader';
	import FileSpreadsheetIcon from '@lucide/svelte/icons/file-spreadsheet';
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import InfoIcon from '@lucide/svelte/icons/info';
	import XIcon from '@lucide/svelte/icons/x';
	import { scanSchedule } from '$lib/utils/scheduleScannerMain';
	import { storeScheduleScanResults, type DateRange } from '$lib/utils/scheduleReviewStorage';
	import step1Img from '$lib/assets/instructions/step-1-weekly-timetable.png';
	import step2Img from '$lib/assets/instructions/step-2-module-dropdown.png';
	import step3Img from '$lib/assets/instructions/step-3-print-popup.png';
	import step4Img from '$lib/assets/instructions/step-4-filter-module.png';
	import step5Img from '$lib/assets/instructions/step-5-download-excel.png';

	// @ Preset semester definitions
	interface SemesterPeriod {
		id: string;
		label: string;
		description: string;
		category: string;
		startDate: string;
		endDate: string;
		startDate2?: string; // For semesters with breaks
		endDate2?: string;
		tentative?: boolean;
	}

	const SEMESTER_PERIODS: SemesterPeriod[] = [
		// Spring 2026
		{
			id: 'sp1-2026',
			label: 'Sp1',
			description: 'Spring 1 (Jan 12 - Feb 27)',
			category: 'Spring 2026',
			startDate: '2026-01-12',
			endDate: '2026-02-13',
			startDate2: '2026-02-23',
			endDate2: '2026-02-27',
		},
		{
			id: 'spiw1-2026',
			label: 'SpIW1',
			description: 'Spring Intensive Week 1 (Mar 2 - 6)',
			category: 'Spring 2026',
			startDate: '2026-03-02',
			endDate: '2026-03-06',
		},
		{
			id: 'spiw2-2026',
			label: 'SpIW2',
			description: 'Spring Intensive Week 2 (Mar 16 - 20)',
			category: 'Spring 2026',
			startDate: '2026-03-16',
			endDate: '2026-03-20',
		},
		{
			id: 'sp2-2026',
			label: 'Sp2',
			description: 'Spring 2 (Mar 23 - May 1)',
			category: 'Spring 2026',
			startDate: '2026-03-23',
			endDate: '2026-05-01',
		},
		{
			id: 'gft-2026',
			label: 'Global Field Trip',
			description: 'Global Field Trip (May 4 - 8)',
			category: 'Spring 2026',
			startDate: '2026-05-04',
			endDate: '2026-05-08',
		},
		// Summer 2026
		{
			id: 'su-2026',
			label: 'Su',
			description: 'Summer (May 11 - Jun 19) - FMBA 1Y only',
			category: 'Summer 2026',
			startDate: '2026-05-11',
			endDate: '2026-06-19',
		},
		{
			id: 'suiw-2026',
			label: 'SuIW',
			description: 'Summer Intensive Week (Jun 29 - Jul 3)',
			category: 'Summer 2026',
			startDate: '2026-06-29',
			endDate: '2026-07-03',
		},
		// Fall 2026 (tentative)
		{
			id: 'f1-2026',
			label: 'F1',
			description: 'Fall 1 (Aug 24 - Oct 9)',
			category: 'Fall 2026',
			startDate: '2026-08-24',
			endDate: '2026-09-21',
			startDate2: '2026-09-28',
			endDate2: '2026-10-09',
			tentative: true,
		},
		{
			id: 'fiw1-2026',
			label: 'FIW1',
			description: 'Fall Intensive Week 1 (Oct 12 - 16)',
			category: 'Fall 2026',
			startDate: '2026-10-12',
			endDate: '2026-10-16',
		},
		{
			id: 'fiw2-2026',
			label: 'FIW2',
			description: 'Fall Intensive Week 2 (Oct 26 - 30)',
			category: 'Fall 2026',
			startDate: '2026-10-26',
			endDate: '2026-10-30',
		},
		{
			id: 'f2-2026',
			label: 'F2',
			description: 'Fall 2 (Nov 2 - Dec 11)',
			category: 'Fall 2026',
			startDate: '2026-11-02',
			endDate: '2026-12-11',
			tentative: true,
		},
	];

	// @ Group semesters by category for display
	const semestersByCategory = $derived(() => {
		const groups: Record<string, SemesterPeriod[]> = {};
		for (const semester of SEMESTER_PERIODS) {
			if (!groups[semester.category]) {
				groups[semester.category] = [];
			}
			groups[semester.category].push(semester);
		}
		return groups;
	});

	// @ State
	let selectedSemesterIds: string[] = $state([]);
	let uploadedFile: File | null = $state(null);
	let uploadStatus: 'idle' | 'success' | 'error' | 'scanning' = $state('idle');
	let errorMessage = $state('');
	let formErrors: string[] = $state([]);
	let isDragging = $state(false);
	let scanProgress = $state('');

	// @ Derived semester info from selections
	let selectedSemesters = $derived(
		SEMESTER_PERIODS.filter((s) => selectedSemesterIds.includes(s.id))
	);

	let semesterLabel = $derived(
		selectedSemesters.map((s) => s.label).join(', ') || ''
	);

	// @ Compute combined date ranges from selected semesters
	let semesterDateRanges = $derived((): DateRange[] => {
		if (selectedSemesters.length === 0) {
			return [];
		}

		// Collect all date ranges with labels from selected semesters
		// Each period keeps its own distinct range(s) — no merging across periods
		const ranges: DateRange[] = [];
		for (const sem of selectedSemesters) {
			ranges.push({ start: sem.startDate, end: sem.endDate, label: sem.label });
			if (sem.startDate2 && sem.endDate2) {
				ranges.push({ start: sem.startDate2, end: sem.endDate2, label: sem.label });
			}
		}

		// Sort by start date
		ranges.sort((a, b) => a.start.localeCompare(b.start));

		return ranges;
	});

	// @ Toggle semester selection
	function toggleSemester(id: string, checked: boolean) {
		if (checked) {
			selectedSemesterIds = [...selectedSemesterIds, id];
		} else {
			selectedSemesterIds = selectedSemesterIds.filter((s) => s !== id);
		}
	}

	// @ Format date for display
	function formatDateDisplay(dateStr: string): string {
		if (!dateStr) return '';
		const date = new Date(dateStr + 'T00:00:00');
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}

	// @ Allowed file types based on user role
	const EXCEL_FILE_TYPES = [
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	];
	const EXCEL_EXTENSIONS = ['.xls', '.xlsx'];
	const PDF_FILE_TYPES = ['application/pdf'];
	const PDF_EXTENSIONS = ['.pdf'];

	// / Get allowed file extensions (both roles accept Excel and PDF)
	function getAllowedExtensions(): string[] {
		return [...EXCEL_EXTENSIONS, ...PDF_EXTENSIONS];
	}

	// / Validate and accept a file
	function acceptFile(file: File) {
		const fileName = file.name.toLowerCase();
		const isValidType =
			EXCEL_FILE_TYPES.includes(file.type) ||
			PDF_FILE_TYPES.includes(file.type) ||
			EXCEL_EXTENSIONS.some((ext) => fileName.endsWith(ext)) ||
			PDF_EXTENSIONS.some((ext) => fileName.endsWith(ext));

		if (!isValidType) {
			uploadStatus = 'error';
			errorMessage = 'Please upload an Excel file (.xls, .xlsx) or PDF file (.pdf)';
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

		if (selectedSemesterIds.length === 0) {
			formErrors.push('Please select at least one semester period');
		}

		if (!uploadedFile) {
			formErrors.push('Please upload your course schedule Excel file');
		}

		if (formErrors.length > 0) return;

		const dateRanges = semesterDateRanges();

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
			if (!storeScheduleScanResults(result, semesterLabel, dateRanges)) {
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
		<h1 class="text-3xl font-bold">Student Schedule Setup</h1>
		<p class="text-muted-foreground mt-2">
			Upload your personal course schedule from GLS to generate calendar reminders for all your classes
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
						<strong>Upload</strong> — Provide your personal course schedule as an Excel file (.xls or .xlsx) exported from GLS. See below for step-by-step export instructions.
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
					Semester Period
				</h2>

				<p class="text-sm text-muted-foreground">
					Select the semester period(s) for your schedule. The dates will be used to generate calendar events.
				</p>

				<!-- @ Semester checkboxes grouped by category -->
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
									<label
										class="flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
											{selectedSemesterIds.includes(semester.id)
												? 'border-primary bg-primary/5'
												: 'border-muted hover:border-muted-foreground/50'}"
									>
										<Checkbox
											checked={selectedSemesterIds.includes(semester.id)}
											onCheckedChange={(checked) => toggleSemester(semester.id, !!checked)}
											class="mt-0.5"
										/>
										<div class="flex-1 min-w-0">
											<div class="font-medium text-sm">{semester.label}</div>
											<div class="text-xs text-muted-foreground mt-0.5">
												{semester.description}
											</div>
											{#if semester.startDate2}
												<div class="text-xs text-muted-foreground mt-1 italic">
													Includes break
												</div>
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
							accept=".xls,.xlsx,.pdf"
							onchange={handleFileSelect}
							aria-label="Upload course schedule file"
						/>

						<div class="flex flex-col items-center gap-3">
							<div class="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
								<UploadIcon class="w-8 h-8 text-muted-foreground" />
							</div>
							<div>
								<p class="font-semibold">Click to upload or drag and drop</p>
								<p class="text-sm text-muted-foreground mt-1">
									Excel (.xls, .xlsx) or PDF files
								</p>
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
						src={step1Img}
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
						src={step2Img}
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
						src={step3Img}
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
						src={step4Img}
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
						src={step5Img}
						alt="Right click and select Download Excel"
						class="rounded-lg border shadow-sm max-w-full"
					/>
				</div>
			</div>
		</div>
	</Card>
</div>
