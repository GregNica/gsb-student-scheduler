<script lang="ts">
	// @ Component for handling syllabus/schedule file uploads
	// # Purpose: Allow students to upload their course documents and trigger scanning

	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import UploadIcon from '@lucide/svelte/icons/upload';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import LoaderIcon from '@lucide/svelte/icons/loader';
	import { getCourseData } from '$lib/utils/courseStorage';
	import { scanSyllabus } from '$lib/utils/syllabusScannerMain';
	import { storeScanResults } from '$lib/utils/reviewStorage';
	import { goto } from '$app/navigation';
	import type { PageData } from './$types';

	// @ State variables
	let uploadedFile: File | null = $state(null);
	let uploadStatus: 'idle' | 'success' | 'error' | 'scanning' | 'complete' = $state('idle');
	let errorMessage = $state('');
	let scanProgress = $state('');
	let scanSteps: Array<{ step: string; status: 'pending' | 'in-progress' | 'complete' | 'error' }> = $state([]);

	// @ Supported file types for syllabus documents
	const ALLOWED_FILE_TYPES = [
		'application/pdf',
		'text/csv',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	];

	const ALLOWED_EXTENSIONS = ['.pdf', '.csv', '.xls', '.xlsx'];

	// / Handle file selection from input
	function handleFileSelect(event: Event) {
		const target = event.target as HTMLInputElement;
		const files = target.files;

		if (!files || files.length === 0) return;

		const file = files[0];

		// # Validate file type
		const isValidType =
			ALLOWED_FILE_TYPES.includes(file.type) ||
			ALLOWED_EXTENSIONS.some((ext) => file.name.toLowerCase().endsWith(ext));

		if (!isValidType) {
			uploadStatus = 'error';
			errorMessage = `Invalid file type. Please upload a PDF, CSV, or Excel file.`;
			uploadedFile = null;
			return;
		}

		// # Validate file size (max 10MB)
		const maxSize = 10 * 1024 * 1024;
		if (file.size > maxSize) {
			uploadStatus = 'error';
			errorMessage = `File is too large. Maximum size is 10MB.`;
			uploadedFile = null;
			return;
		}

		// / File is valid, store it
		uploadedFile = file;
		uploadStatus = 'success';
		errorMessage = '';
	}

	// @ Handle scanning and navigation
	async function handleScanAndReview() {
		console.log('📌 Scan button clicked');
		
		if (!uploadedFile) {
			console.error('❌ No file selected');
			errorMessage = 'No file selected';
			uploadStatus = 'error';
			return;
		}

		console.log('✅ File found:', uploadedFile.name);
		uploadStatus = 'scanning';
		errorMessage = '';
		scanProgress = '';
		scanSteps = [
			{ step: 'Reading file', status: 'in-progress' },
			{ step: 'Scanning keywords', status: 'pending' },
			{ step: 'Processing results', status: 'pending' },
			{ step: 'Preparing review', status: 'pending' }
		];

		try {
			// Step 1: Read file
			console.log('📖 Reading file...');
			scanProgress = 'Reading file contents...';
			await new Promise(resolve => setTimeout(resolve, 300));
			const fileText = await uploadedFile.text();
			console.log('✅ File read successfully, size:', fileText.length);
			
			if (!fileText.trim()) {
				throw new Error('File is empty');
			}
			scanSteps[0].status = 'complete';

			// Step 2: Get course data and scan
			console.log('🔍 Getting course data...');
			scanProgress = 'Scanning for keywords...';
			scanSteps[1].status = 'in-progress';
			const courseData = getCourseData();
			console.log('✅ Course data retrieved:', { 
				name: courseData.courseName, 
				hasKeywords: courseData.otherKeywords.length > 0,
				semesterStart: courseData.semesterStart
			});
			
			if (!courseData.courseName || !courseData.semesterStart) {
				console.error('❌ Course setup incomplete');
				throw new Error('Please go to "Course Setup" and fill in the course name and semester dates');
			}
			
			await new Promise(resolve => setTimeout(resolve, 300));
			console.log('🔎 Calling scanSyllabus...');
			const result = await scanSyllabus(uploadedFile, courseData);
			console.log('✅ Scan results:', result);
			
			if (!result || !result.assignments || result.assignments.length === 0) {
				throw new Error('No assignments found in document');
			}
			scanSteps[1].status = 'complete';

			// Step 3: Process and store results
			console.log('💾 Storing results...');
			scanProgress = 'Processing and storing results...';
			scanSteps[2].status = 'in-progress';
			await new Promise(resolve => setTimeout(resolve, 300));
			if (!storeScanResults(result)) {
				throw new Error('Failed to process scan results');
			}
			scanSteps[2].status = 'complete';

			// Step 4: Prepare review
			console.log('📋 Preparing review...');
			scanProgress = 'Preparing review interface...';
			scanSteps[3].status = 'in-progress';
			await new Promise(resolve => setTimeout(resolve, 300));
			scanSteps[3].status = 'complete';

			// Show completion state briefly
			uploadStatus = 'complete';
			scanProgress = 'Scan complete! Redirecting to review...';
			console.log('✅ Scan complete, navigating...');
			await new Promise(resolve => setTimeout(resolve, 800));

			goto('/review');
		} catch (error) {
			console.error('❌ Scanning error:', error);
			errorMessage = `Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
			uploadStatus = 'error';
			scanProgress = '';
			scanSteps = scanSteps.map((s) => ({
				...s,
				status: s.status === 'complete' ? 'complete' : 'error'
			}));
		}
	}

	// / Reset form to allow new upload
	function handleReset() {
		uploadedFile = null;
		uploadStatus = 'idle';
		errorMessage = '';
		scanProgress = '';
		scanSteps = [];
		const input = document.querySelector('input[type="file"]') as HTMLInputElement;
		if (input) input.value = '';
	}

</script>

<!-- @ Page title and description -->
<div class="flex flex-col gap-6">
	<div>
		<h1 class="text-3xl font-bold">Upload Your Syllabus</h1>
		<p class="text-muted-foreground mt-2">
			Upload your course syllabus or schedule to automatically extract important dates
		</p>
	</div>

	<!-- # Main upload card -->
	<Card class="p-8">
		<div class="flex flex-col gap-6">
			<!-- / File input section -->
			<div class="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-muted-foreground/50 transition-colors cursor-pointer">
				<input
					type="file"
					class="hidden"
					id="file-upload"
					accept=".pdf,.csv,.xls,.xlsx"
					onchange={handleFileSelect}
					aria-label="Upload syllabus file"
				/>

				<label for="file-upload" class="cursor-pointer flex flex-col items-center gap-3">
					<UploadIcon class="w-12 h-12 text-muted-foreground" />
					<div>
						<p class="font-semibold">Click to upload or drag and drop</p>
						<p class="text-sm text-muted-foreground">PDF, CSV, or Excel files (Max 10MB)</p>
					</div>
				</label>
			</div>

			<!-- # Upload status feedback -->
			{#if uploadStatus === 'success' && uploadedFile}
				<div class="flex items-start gap-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
					<CheckCircleIcon class="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
					<div>
						<p class="font-semibold text-green-900 dark:text-green-100">File uploaded successfully</p>
						<p class="text-sm text-green-800 dark:text-green-200">
							{uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(2)} KB)
						</p>
						<p class="text-sm text-green-700 dark:text-green-300 mt-2">
							Ready to scan. Click "Scan for Assignments" to find dates and keywords.
						</p>
					</div>
				</div>

				<!-- / Action buttons after successful upload -->
				<div class="flex gap-3">
				<Button 
					variant="default" 
					onclick={handleScanAndReview} 
					disabled={uploadStatus === 'scanning' || uploadStatus === 'complete' || !uploadedFile}
				>
					{#if uploadStatus === 'scanning'}
						<LoaderIcon class="w-4 h-4 mr-2 animate-spin" />
						Scanning...
					{:else if uploadStatus === 'complete'}
						<CheckCircleIcon class="w-4 h-4 mr-2 text-green-600" />
						Complete!
					{:else}
						Scan for Assignments
					{/if}
				</Button>
				<Button variant="outline" onclick={handleReset} disabled={uploadStatus === 'scanning'}>
					Upload Another File
				</Button>
			</div>

			<!-- @ Show detailed scan progress with steps -->
			{#if (uploadStatus === 'scanning' || uploadStatus === 'complete') && scanSteps.length > 0}
				<div class="space-y-3 p-4 bg-muted/50 rounded-lg border border-muted">
					<p class="text-sm font-semibold">Scanning Progress</p>
					<div class="space-y-2">
						{#each scanSteps as step, idx (idx)}
							<div class="flex items-center gap-3">
								<div class="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 {
									step.status === 'complete' ? 'bg-green-600' :
									step.status === 'in-progress' ? 'bg-blue-600' :
									step.status === 'error' ? 'bg-red-600' :
									'bg-muted-foreground/30'
								}">
									{#if step.status === 'complete'}
										<CheckCircleIcon class="w-4 h-4 text-white" />
									{:else if step.status === 'in-progress'}
										<LoaderIcon class="w-4 h-4 text-white animate-spin" />
									{:else if step.status === 'error'}
										<AlertCircleIcon class="w-4 h-4 text-white" />
									{:else}
										<div class="w-2 h-2 bg-muted-foreground/50 rounded-full"></div>
									{/if}
								</div>
								<span class="text-sm {
									step.status === 'complete' ? 'text-green-700 dark:text-green-300 font-medium' :
									step.status === 'in-progress' ? 'text-blue-700 dark:text-blue-300 font-medium' :
									step.status === 'error' ? 'text-red-700 dark:text-red-300' :
									'text-muted-foreground'
								}">
									{step.step}
								</span>
							</div>
						{/each}
					</div>
					{#if scanProgress}
						<p class="text-xs text-muted-foreground mt-2 italic">{scanProgress}</p>
					{/if}
				</div>
			{/if}
			{/if}

			{#if uploadStatus === 'error'}
				<div class="flex items-start gap-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
					<AlertCircleIcon class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
					<div class="flex-1">
						<p class="font-semibold text-red-900 dark:text-red-100">Upload failed</p>
						<p class="text-sm text-red-800 dark:text-red-200">{errorMessage}</p>
						{#if errorMessage.includes('Course Setup')}
							<p class="text-sm text-red-700 dark:text-red-300 mt-2">
								<a href="/setup" class="underline font-semibold hover:no-underline">Go to Course Setup →</a>
							</p>
						{/if}
					</div>
				</div>

				<Button variant="outline" onclick={handleReset}>Try Again</Button>
			{/if}
		</div>
	</Card>

	<!-- # Supported formats info -->
	<Card class="p-6 bg-muted/50">
		<h3 class="font-semibold mb-3">Supported File Formats</h3>
		<ul class="text-sm space-y-2 text-muted-foreground">
			<li>📄 <strong>PDF</strong> - Course syllabi, schedule documents</li>
			<li>📊 <strong>CSV</strong> - Spreadsheet exports with dates</li>
			<li>📋 <strong>Excel</strong> - .xls and .xlsx files</li>
		</ul>
		<p class="text-xs mt-4 text-muted-foreground">
			The app works with non-standardized formats and will search for keywords like: quiz, assignment,
			project, essay, case study, before class, homework
		</p>
	</Card>
</div>
