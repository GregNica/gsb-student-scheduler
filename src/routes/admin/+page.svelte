<script lang="ts">
	import { scanSchedule } from '$lib/utils/scheduleScannerMain';
	import { publishMultipleSemesters } from '$lib/utils/githubPublisher';
	import type { ParsedCourse, MeetingSlot, ProgramType } from '$lib/utils/scheduleParser';

	let { data } = $props();

	// ─── Tab state ───────────────────────────────────────────────────
	let activeTab: 'courses' | 'users' = $state('courses');

	// ─── User management ─────────────────────────────────────────────
	let users: { email: string; role: string }[] = $state(data.users);
	let newEmail = $state('');
	let newRole: 'student' | 'professor' | 'admin' = $state('student');
	let userError = $state('');
	let userSuccess = $state('');

	async function addUser() {
		userError = ''; userSuccess = '';
		if (!newEmail.includes('@')) { userError = 'Enter a valid email'; return; }
		const res = await fetch('/api/admin/users', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: newEmail.trim().toLowerCase(), role: newRole })
		});
		if (!res.ok) { userError = await res.text(); return; }
		users = [...users.filter(u => u.email !== newEmail.trim().toLowerCase()), { email: newEmail.trim().toLowerCase(), role: newRole }];
		userSuccess = `${newEmail} added as ${newRole}`;
		newEmail = '';
	}

	async function removeUser(email: string) {
		userError = ''; userSuccess = '';
		const res = await fetch('/api/admin/users', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email })
		});
		if (!res.ok) { userError = await res.text(); return; }
		users = users.filter(u => u.email !== email);
	}

	async function changeRole(email: string, role: string) {
		const res = await fetch('/api/admin/users', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, role })
		});
		if (res.ok) users = users.map(u => u.email === email ? { ...u, role } : u);
	}

	// ─── Course upload (from old admin) ──────────────────────────────
	interface SemesterPeriod {
		id: string; label: string; description: string; category: string;
		startDate: string; endDate: string; startDate2?: string; endDate2?: string; tentative?: boolean;
	}

	const DEFAULT_PERIODS: SemesterPeriod[] = [
		{ id: 'sp1-2026',   label: 'Sp1',   description: 'Spring 1 (Jan 12 – Feb 27, 2026)',            category: 'Spring 2026', startDate: '2026-01-12', endDate: '2026-02-13', startDate2: '2026-02-23', endDate2: '2026-02-27' },
		{ id: 'spiw1-2026', label: 'SpIW1', description: 'Spring Intensive Week 1 (Mar 2–6, 2026)',      category: 'Spring 2026', startDate: '2026-03-02', endDate: '2026-03-06' },
		{ id: 'spiw2-2026', label: 'SpIW2', description: 'Spring Intensive Week 2 (Mar 16–20, 2026)',    category: 'Spring 2026', startDate: '2026-03-16', endDate: '2026-03-20' },
		{ id: 'sp2-2026',   label: 'Sp2',   description: 'Spring 2 (Mar 23 – May 1, 2026)',              category: 'Spring 2026', startDate: '2026-03-23', endDate: '2026-05-01' },
		{ id: 'gft-2026',   label: 'GFT',   description: 'Global Field Trip (May 4–8, 2026)',            category: 'Spring 2026', startDate: '2026-05-04', endDate: '2026-05-08' },
		{ id: 'su-2026',    label: 'Su',    description: 'Summer (May 11 – Jun 19, 2026)',               category: 'Summer 2026', startDate: '2026-05-11', endDate: '2026-06-19' },
		{ id: 'suiw-2026',  label: 'SuIW',  description: 'Summer Intensive Week (Jun 29 – Jul 3, 2026)', category: 'Summer 2026', startDate: '2026-06-29', endDate: '2026-07-03' },
		{ id: 'f1-2026',    label: 'F1',    description: 'Fall 1 (Aug 24 – Oct 9, 2026)',                category: 'Fall 2026',   startDate: '2026-08-24', endDate: '2026-09-21', startDate2: '2026-09-28', endDate2: '2026-10-09', tentative: true },
		{ id: 'fiw1-2026',  label: 'FIW1',  description: 'Fall Intensive Week 1 (Oct 12–16, 2026)',      category: 'Fall 2026',   startDate: '2026-10-12', endDate: '2026-10-16' },
		{ id: 'fiw2-2026',  label: 'FIW2',  description: 'Fall Intensive Week 2 (Oct 26–30, 2026)',      category: 'Fall 2026',   startDate: '2026-10-26', endDate: '2026-10-30' },
		{ id: 'f2-2026',    label: 'F2',    description: 'Fall 2 (Nov 2 – Dec 11, 2026)',                category: 'Fall 2026',   startDate: '2026-11-02', endDate: '2026-12-11', tentative: true },
	];

	const DAY_OPTIONS: { label: string; days: string[] }[] = [
		{ label: 'Mon, Wed', days: ['Monday', 'Wednesday'] },
		{ label: 'Tue, Thu', days: ['Tuesday', 'Thursday'] },
		{ label: 'Mon',      days: ['Monday'] },
		{ label: 'Tue',      days: ['Tuesday'] },
		{ label: 'Wed',      days: ['Wednesday'] },
		{ label: 'Thu',      days: ['Thursday'] },
		{ label: 'Fri',      days: ['Friday'] },
		{ label: 'Mon-Fri',  days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] },
		{ label: 'Sat',      days: ['Saturday'] },
	];

	const TIME_OPTIONS: string[] = (() => {
		const t: string[] = [];
		for (let h = 8; h <= 21; h++) {
			for (let m = 0; m < 60; m += 5) {
				t.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
			}
		}
		return t;
	})();

	const DAY_ORDER: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };

	interface TimeBlock { startTime: string; endTime: string; }
	interface EditableRow {
		courseCode: string; courseTitle: string; program: string; instructor: string;
		days: string; timeBlocks: TimeBlock[]; room: string;
		_id: string; _dateRanges: { start: string; end: string; label?: string }[];
	}

	let semesterPeriods: SemesterPeriod[] = $state(DEFAULT_PERIODS);
	let editingPeriodId: string | null = $state(null);
	let editDraft: SemesterPeriod | null = $state(null);
	let selectedSemesterIds: string[] = $state([]);
	let uploadedFile: File | null = $state(null);
	let isDragging = $state(false);
	let parseError = $state('');
	let isParsing = $state(false);
	let editableGroups: { period: SemesterPeriod; rows: EditableRow[] }[] = $state([]);
	let unmatchedCourses: ParsedCourse[] = $state([]);
	let pat = $state('');
	let patSaved = $state(false);
	let publishLog: { repo: string; status: 'pending' | 'success' | 'error'; message?: string }[] = $state([]);
	type Step = 'upload' | 'preview' | 'publishing' | 'done';
	let step: Step = $state('upload');

	let periodsByCategory = $derived.by(() => {
		const result: Record<string, SemesterPeriod[]> = {};
		for (const p of semesterPeriods) {
			if (!result[p.category]) result[p.category] = [];
			result[p.category].push(p);
		}
		return result;
	});

	let selectedLabels = $derived(semesterPeriods.filter(p => selectedSemesterIds.includes(p.id)).map(p => p.label).join(', '));
	let totalEditableRows = $derived(editableGroups.reduce((n, g) => n + g.rows.length, 0));

	function matchDayOption(slotDays: string[]): string {
		const parsed = new Set(slotDays);
		for (const opt of DAY_OPTIONS) {
			if (opt.days.length === parsed.size && opt.days.every(d => parsed.has(d))) return opt.label;
		}
		return slotDays.map(d => d.slice(0, 3)).join(', ');
	}

	function snapTo5(time: string): string {
		if (!time) return '';
		const [h, m] = time.split(':').map(Number);
		if (isNaN(h) || isNaN(m)) return '';
		const snapped = Math.round(m / 5) * 5;
		const adjH = snapped >= 60 ? h + 1 : h;
		const adjM = snapped >= 60 ? snapped - 60 : snapped;
		return `${String(adjH).padStart(2, '0')}:${String(adjM).padStart(2, '0')}`;
	}

	function startEdit(id: string) {
		const p = semesterPeriods.find(p => p.id === id);
		if (p) { editingPeriodId = id; editDraft = { startDate2: '', endDate2: '', tentative: false, ...p }; }
	}
	function saveEdit() {
		if (!editDraft) return;
		const period: SemesterPeriod = { ...editDraft };
		if (!period.startDate2) delete period.startDate2;
		if (!period.endDate2) delete period.endDate2;
		const idx = semesterPeriods.findIndex(p => p.id === editingPeriodId);
		if (idx >= 0) semesterPeriods[idx] = period;
		editingPeriodId = null; editDraft = null;
	}
	function cancelEdit() { editingPeriodId = null; editDraft = null; }
	function deletePeriod(id: string) {
		semesterPeriods = semesterPeriods.filter(p => p.id !== id);
		selectedSemesterIds = selectedSemesterIds.filter(s => s !== id);
	}
	function addSemester() {
		const newId = `period-${Date.now()}`;
		const blank: SemesterPeriod = { id: newId, label: '', description: '', category: 'Spring 2026', startDate: '', endDate: '' };
		semesterPeriods = [...semesterPeriods, blank];
		editingPeriodId = newId;
		editDraft = { startDate2: '', endDate2: '', tentative: false, ...blank };
	}
	function toggleSemester(id: string, checked: boolean) {
		if (checked) selectedSemesterIds = [...selectedSemesterIds, id];
		else selectedSemesterIds = selectedSemesterIds.filter(s => s !== id);
	}

	function acceptFile(file: File) {
		if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') { parseError = 'Please upload a PDF file'; return; }
		if (file.size > 20 * 1024 * 1024) { parseError = 'File too large (max 20MB)'; return; }
		uploadedFile = file; parseError = '';
	}
	function handleFileSelect(e: Event) { const f = (e.target as HTMLInputElement).files; if (f?.[0]) acceptFile(f[0]); }
	function handleDrop(e: DragEvent) { e.preventDefault(); isDragging = false; const f = e.dataTransfer?.files; if (f?.[0]) acceptFile(f[0]); }

	function sortRows(rows: EditableRow[]): EditableRow[] {
		return [...rows].sort((a, b) => {
			const aOpt = DAY_OPTIONS.find(o => o.label === a.days);
			const bOpt = DAY_OPTIONS.find(o => o.label === b.days);
			const aDay = DAY_ORDER[aOpt?.days[0] ?? ''] ?? 99;
			const bDay = DAY_ORDER[bOpt?.days[0] ?? ''] ?? 99;
			if (aDay !== bDay) return aDay - bDay;
			return (a.timeBlocks[0]?.startTime ?? '').localeCompare(b.timeBlocks[0]?.startTime ?? '');
		});
	}

	function courseToRow(course: ParsedCourse): EditableRow {
		const slots = course.meetingSlots ?? [];
		const uniqueDays = [...new Set(slots.map(s => s.day))];
		const days = matchDayOption(uniqueDays);
		const seen = new Set<string>();
		const timeBlocks: TimeBlock[] = [];
		for (const slot of slots) {
			const key = `${slot.startTime}|${slot.endTime}`;
			if (!seen.has(key)) { seen.add(key); timeBlocks.push({ startTime: snapTo5(slot.startTime), endTime: snapTo5(slot.endTime) }); }
		}
		if (timeBlocks.length === 0) timeBlocks.push({ startTime: '', endTime: '' });
		const rooms = [...new Set(slots.map(s => s.room).filter(Boolean))];
		return {
			courseCode: course.courseCode ?? '', courseTitle: course.courseTitle ?? '',
			program: course.program ?? 'FMBA', instructor: course.instructor ?? '',
			days, timeBlocks, room: rooms.join(', '),
			_id: course.id, _dateRanges: course.dateRanges ?? [],
		};
	}

	function rowToCourse(row: EditableRow): ParsedCourse {
		const opt = DAY_OPTIONS.find(o => o.label === row.days);
		const dayNames = opt ? opt.days : row.days.split(/[,\s]+/).filter(Boolean);
		const meetingSlots: MeetingSlot[] = [];
		for (const day of dayNames) {
			for (const block of row.timeBlocks) {
				if (block.startTime && block.endTime) {
					meetingSlots.push({ day, dayCode: day.slice(0, 3), startTime: block.startTime, endTime: block.endTime, room: row.room });
				}
			}
		}
		return {
			id: row._id, courseCode: row.courseCode, courseTitle: row.courseTitle,
			instructor: row.instructor, credits: '', campus: '', meetingSlots,
			confidence: 'high', reasons: [], sourceRows: [0, 0, 0],
			rawTimeRoom: row.timeBlocks.map(b => `${b.startTime}-${b.endTime}`).join(', '),
			program: row.program as ProgramType, dateRanges: row._dateRanges,
		};
	}

	async function parsePdf() {
		if (!uploadedFile) { parseError = 'Please select a PDF file first'; return; }
		if (selectedSemesterIds.length === 0) { parseError = 'Please select at least one semester period first'; return; }
		isParsing = true; parseError = '';
		try {
			const result = await scanSchedule(uploadedFile);
			if (!result.courses.length) throw new Error('No courses found in this PDF');
			const selectedPeriods = semesterPeriods.filter(p => selectedSemesterIds.includes(p.id));
			editableGroups = selectedPeriods.map(period => ({
				period,
				rows: sortRows(result.courses
					.filter(c => { const l = c.dateRanges?.[0]?.label ?? ''; return l === period.label || l.startsWith(period.label); })
					.map(courseToRow)),
			}));
			unmatchedCourses = result.courses.filter(c => {
				const l = c.dateRanges?.[0]?.label ?? '';
				return !semesterPeriods.some(p => l === p.label || l.startsWith(p.label));
			});
			step = 'preview';
		} catch (e) { parseError = e instanceof Error ? e.message : 'Parse failed'; }
		finally { isParsing = false; }
	}

	function addRow(groupIdx: number) {
		const period = editableGroups[groupIdx].period;
		editableGroups[groupIdx].rows.push({
			courseCode: '', courseTitle: '', program: 'FMBA', instructor: '',
			days: '', timeBlocks: [{ startTime: '', endTime: '' }], room: '',
			_id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			_dateRanges: [{ start: period.startDate, end: period.endDate, label: period.label }],
		});
	}
	function removeRow(groupIdx: number, rowIdx: number) { editableGroups[groupIdx].rows.splice(rowIdx, 1); }
	function addBlock(groupIdx: number, rowIdx: number) { editableGroups[groupIdx].rows[rowIdx].timeBlocks.push({ startTime: '', endTime: '' }); }
	function removeBlock(groupIdx: number, rowIdx: number, blockIdx: number) { editableGroups[groupIdx].rows[rowIdx].timeBlocks.splice(blockIdx, 1); }

	async function publish() {
		if (!pat.trim()) { parseError = 'Please enter your GitHub token before publishing'; return; }
		const updates = editableGroups.map(g => ({ semester: g.period, courses: g.rows.map(rowToCourse) }));
		publishLog = [
			{ repo: 'gsb-student-scheduler', status: 'pending' },
			{ repo: 'gsb-professor-calendar-scheduler', status: 'pending' },
		];
		step = 'publishing';
		const repos = ['gsb-student-scheduler', 'gsb-professor-calendar-scheduler'];
		for (let i = 0; i < repos.length; i++) {
			try {
				await publishMultipleSemesters({ pat: pat.trim(), owner: 'GregNica', repo: repos[i], updates });
				publishLog[i] = { repo: repos[i], status: 'success' };
			} catch (e) {
				publishLog[i] = { repo: repos[i], status: 'error', message: e instanceof Error ? e.message : 'Unknown error' };
			}
		}
		step = 'done';
	}

	function reset() { uploadedFile = null; editableGroups = []; unmatchedCourses = []; parseError = ''; publishLog = []; step = 'upload'; }

	const inp = 'w-full bg-transparent border border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none rounded px-1 py-0.5 text-xs';
	const sel = 'w-full bg-background border border-transparent hover:border-muted-foreground/30 focus:border-primary focus:outline-none rounded px-1 py-0.5 text-xs cursor-pointer';
</script>

<div class="space-y-6">
	<div class="border-b pb-4">
		<h1 class="text-2xl font-bold">Admin Panel</h1>
		<p class="text-sm text-muted-foreground mt-1">Manage users and course schedules</p>
	</div>

	<!-- Tabs -->
	<div class="flex gap-1 border-b">
		<button onclick={() => activeTab = 'courses'}
			class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors {activeTab === 'courses' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}">
			Course Upload
		</button>
		<button onclick={() => activeTab = 'users'}
			class="px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors {activeTab === 'users' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}">
			User Management
		</button>
	</div>

	<!-- ─── USER MANAGEMENT TAB ─────────────────────────────────── -->
	{#if activeTab === 'users'}
		<div class="space-y-6 max-w-xl">
			<div class="space-y-2">
				<h2 class="font-semibold">Add Allowed User</h2>
				<p class="text-sm text-muted-foreground">Only emails listed here can log in (besides your admin email).</p>
				<div class="flex gap-2">
					<input bind:value={newEmail} type="email" placeholder="student@skku.edu"
						class="flex-1 border rounded-lg px-3 py-2 text-sm bg-background"
						onkeydown={(e) => e.key === 'Enter' && addUser()} />
					<select bind:value={newRole} class="border rounded-lg px-3 py-2 text-sm bg-background">
						<option value="student">Student</option>
						<option value="professor">Professor</option>
						<option value="admin">Admin</option>
					</select>
					<button onclick={addUser}
						class="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90">
						Add
					</button>
				</div>
				{#if userError}<p class="text-sm text-red-600">{userError}</p>{/if}
				{#if userSuccess}<p class="text-sm text-green-600">{userSuccess}</p>{/if}
			</div>

			<div class="space-y-2">
				<h2 class="font-semibold">Allowed Users ({users.length})</h2>
				{#if users.length === 0}
					<p class="text-sm text-muted-foreground">No users added yet.</p>
				{:else}
					<div class="border rounded-lg overflow-hidden">
						<table class="w-full text-sm">
							<thead class="bg-muted/50">
								<tr>
									<th class="text-left px-4 py-2 font-medium">Email</th>
									<th class="text-left px-4 py-2 font-medium w-32">Role</th>
									<th class="w-16 px-4 py-2"></th>
								</tr>
							</thead>
							<tbody>
								{#each users as u}
									<tr class="border-t">
										<td class="px-4 py-2">{u.email}</td>
										<td class="px-4 py-2">
											<select value={u.role} onchange={(e) => changeRole(u.email, (e.target as HTMLSelectElement).value)}
												class="border rounded px-2 py-1 text-xs bg-background w-full">
												<option value="student">Student</option>
												<option value="professor">Professor</option>
												<option value="admin">Admin</option>
											</select>
										</td>
										<td class="px-4 py-2">
											<button onclick={() => removeUser(u.email)}
												class="text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 rounded px-2 py-1">
												Remove
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}
			</div>
		</div>

	<!-- ─── COURSE UPLOAD TAB ────────────────────────────────────── -->
	{:else if activeTab === 'courses'}
		{#if step === 'upload'}
			<div class="space-y-6">
				<!-- GitHub PAT -->
				<div class="space-y-2">
					<label class="block text-sm font-medium" for="pat-input">GitHub Personal Access Token</label>
					<p class="text-xs text-muted-foreground">Required for publishing. Generate at GitHub → Settings → Developer settings → Fine-grained tokens. Grant <strong>Contents: read &amp; write</strong> to <code>gsb-student-scheduler</code> and <code>gsb-professor-calendar-scheduler</code>.</p>
					<div class="flex gap-2">
						<input id="pat-input" type="password" bind:value={pat} placeholder="github_pat_..."
							class="flex-1 border rounded-lg px-3 py-2 text-sm font-mono bg-background"
							oninput={() => patSaved = false} />
						<button onclick={() => patSaved = true}
							class="bg-muted border rounded-lg px-3 py-2 text-sm hover:bg-muted/80">
							{patSaved ? '✓ Saved' : 'Save'}
						</button>
					</div>
				</div>

				<!-- Semester periods -->
				<div class="space-y-3">
					<label class="block text-sm font-medium">Semesters to update</label>
					<p class="text-xs text-muted-foreground">Select all periods covered by the PDF.</p>
					<div class="space-y-4">
						{#each Object.entries(periodsByCategory) as [category, periods]}
							<div class="space-y-2">
								<p class="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{category}</p>
								<div class="grid grid-cols-2 gap-2">
									{#each periods as period}
										{#if editingPeriodId === period.id && editDraft}
											<div class="col-span-2 p-3 rounded-lg border border-primary/50 bg-primary/5 space-y-2">
												<p class="text-xs font-semibold text-primary">Edit period</p>
												<div class="grid grid-cols-2 gap-2">
													<div>
														<label class="text-xs font-medium block mb-0.5" for="edit-label">Label</label>
														<input id="edit-label" bind:value={editDraft.label} class="w-full border rounded px-2 py-1 text-xs bg-background" placeholder="Sp1" />
													</div>
													<div>
														<label class="text-xs font-medium block mb-0.5" for="edit-category">Category</label>
														<input id="edit-category" bind:value={editDraft.category} class="w-full border rounded px-2 py-1 text-xs bg-background" />
													</div>
													<div class="col-span-2">
														<label class="text-xs font-medium block mb-0.5" for="edit-desc">Description</label>
														<input id="edit-desc" bind:value={editDraft.description} class="w-full border rounded px-2 py-1 text-xs bg-background" />
													</div>
													<div>
														<label class="text-xs font-medium block mb-0.5" for="edit-start">Start date</label>
														<input id="edit-start" type="date" bind:value={editDraft.startDate} class="w-full border rounded px-2 py-1 text-xs bg-background" />
													</div>
													<div>
														<label class="text-xs font-medium block mb-0.5" for="edit-end">End date</label>
														<input id="edit-end" type="date" bind:value={editDraft.endDate} class="w-full border rounded px-2 py-1 text-xs bg-background" />
													</div>
													<div>
														<label class="text-xs font-medium block mb-0.5" for="edit-start2">Start date 2 <span class="text-muted-foreground font-normal">(optional)</span></label>
														<input id="edit-start2" type="date" bind:value={editDraft.startDate2} class="w-full border rounded px-2 py-1 text-xs bg-background" />
													</div>
													<div>
														<label class="text-xs font-medium block mb-0.5" for="edit-end2">End date 2 <span class="text-muted-foreground font-normal">(optional)</span></label>
														<input id="edit-end2" type="date" bind:value={editDraft.endDate2} class="w-full border rounded px-2 py-1 text-xs bg-background" />
													</div>
												</div>
												<label class="flex items-center gap-2 text-xs cursor-pointer">
													<input type="checkbox" bind:checked={editDraft.tentative} />
													Mark as tentative
												</label>
												<div class="flex gap-2 pt-1">
													<button onclick={saveEdit} class="text-xs bg-primary text-primary-foreground rounded px-3 py-1 hover:opacity-90">Save</button>
													<button onclick={cancelEdit} class="text-xs border rounded px-3 py-1 hover:bg-muted/50">Cancel</button>
												</div>
											</div>
										{:else}
											<div class="flex items-start gap-2 p-2.5 rounded-lg border transition-colors {selectedSemesterIds.includes(period.id) ? 'border-primary bg-primary/5' : 'border-muted hover:border-muted-foreground/40'}">
												<label class="flex items-start gap-2 flex-1 cursor-pointer min-w-0">
													<input type="checkbox" class="mt-0.5 accent-primary shrink-0"
														checked={selectedSemesterIds.includes(period.id)}
														onchange={(e) => toggleSemester(period.id, (e.target as HTMLInputElement).checked)} />
													<div class="min-w-0">
														<p class="text-sm font-medium">{period.label}{period.tentative ? ' *' : ''}</p>
														<p class="text-xs text-muted-foreground leading-tight">{period.description}</p>
													</div>
												</label>
												<div class="flex gap-0.5 shrink-0">
													<button onclick={() => startEdit(period.id)} title="Edit" class="text-xs text-muted-foreground hover:text-foreground border border-transparent hover:border-muted-foreground/30 rounded px-1.5 py-0.5">✎</button>
													<button onclick={() => deletePeriod(period.id)} title="Delete" class="text-xs text-muted-foreground hover:text-red-600 border border-transparent hover:border-red-300 rounded px-1.5 py-0.5">✕</button>
												</div>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/each}
						<button onclick={addSemester} class="text-xs text-primary border border-primary/30 hover:bg-primary/5 rounded-lg px-3 py-1.5 w-full">+ Add Semester</button>
					</div>
					{#if selectedSemesterIds.length > 0}
						<p class="text-xs text-green-700 font-medium">✓ Selected: {selectedLabels}</p>
					{/if}
				</div>

				<!-- PDF upload -->
				<div class="space-y-2">
					<label class="block text-sm font-medium">Program timetable PDF</label>
					<div class="border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors {isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'}"
						role="button" tabindex="0"
						ondragover={(e) => { e.preventDefault(); isDragging = true; }}
						ondragleave={() => isDragging = false}
						ondrop={handleDrop}
						onclick={() => document.getElementById('pdf-upload')?.click()}
						onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && document.getElementById('pdf-upload')?.click()}>
						<input type="file" id="pdf-upload" class="hidden" accept=".pdf" onchange={handleFileSelect} />
						{#if uploadedFile}
							<p class="font-medium text-green-700">✓ {uploadedFile.name}</p>
							<p class="text-sm text-muted-foreground mt-1">{(uploadedFile.size / 1024).toFixed(0)} KB — click to replace</p>
						{:else}
							<p class="font-medium">Click to upload or drag and drop</p>
							<p class="text-sm text-muted-foreground mt-1">PDF files only</p>
						{/if}
					</div>
					{#if parseError}<p class="text-sm text-red-600">{parseError}</p>{/if}
				</div>

				<button onclick={parsePdf} disabled={!uploadedFile || isParsing || selectedSemesterIds.length === 0}
					class="w-full bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-50">
					{isParsing ? 'Parsing PDF...' : 'Parse PDF'}
				</button>
			</div>

		{:else if step === 'preview'}
			<div class="space-y-6">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="font-semibold">Preview & Edit — {selectedLabels}</h2>
						<p class="text-sm text-muted-foreground">{totalEditableRows} courses total — click any cell to edit</p>
					</div>
					<button onclick={reset} class="text-sm text-muted-foreground underline">Re-upload</button>
				</div>

				{#if unmatchedCourses.length > 0}
					<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 space-y-1">
						<p><strong>{unmatchedCourses.length} course{unmatchedCourses.length !== 1 ? 's' : ''} could not be matched to any selected period</strong> and will not be published:</p>
						<ul class="list-disc list-inside text-xs space-y-0.5">
							{#each unmatchedCourses as c}
								<li>{c.courseTitle || 'Untitled'}{c.courseCode ? ` (${c.courseCode})` : ''}{c.dateRanges?.[0]?.label ? ` — detected label: "${c.dateRanges[0].label}"` : ' — no period label detected'}</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#each editableGroups as group, groupIdx}
					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<h3 class="font-medium text-sm">{group.period.label}</h3>
							<span class="text-xs text-muted-foreground">{group.period.description}</span>
							<span class="ml-auto text-xs font-medium {group.rows.length === 0 ? 'text-amber-600' : 'text-green-600'}">{group.rows.length} courses</span>
						</div>
						{#if group.rows.length === 0}
							<p class="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">No courses matched this period.</p>
						{/if}
						<div class="border rounded-lg overflow-x-auto">
							<table class="w-full text-xs">
								<thead class="bg-muted/50">
									<tr>
										<th class="w-16 px-2 py-1.5"></th>
										<th class="text-left px-2 py-1.5 font-medium w-24">Code</th>
										<th class="text-left px-2 py-1.5 font-medium">Title</th>
										<th class="text-left px-2 py-1.5 font-medium w-16">Prog</th>
										<th class="text-left px-2 py-1.5 font-medium w-32">Instructor</th>
										<th class="text-left px-2 py-1.5 font-medium w-28">Days</th>
										<th class="text-left px-2 py-1.5 font-medium w-52">Time Block(s)</th>
										<th class="text-left px-2 py-1.5 font-medium w-20">Room</th>
									</tr>
								</thead>
								<tbody>
									{#each group.rows as row, rowIdx}
										<tr class="border-t {rowIdx % 2 === 0 ? '' : 'bg-muted/20'} align-top">
											<td class="px-2 py-1.5">
												<button onclick={() => removeRow(groupIdx, rowIdx)}
													class="text-xs text-red-500 hover:text-red-700 border border-red-300 hover:border-red-500 rounded px-2 py-0.5 font-medium">Delete</button>
											</td>
											<td class="px-1 py-1.5"><input bind:value={row.courseCode} class={inp} placeholder="GSB5000" /></td>
											<td class="px-1 py-1.5"><input bind:value={row.courseTitle} class={inp} placeholder="Course Title" /></td>
											<td class="px-1 py-1.5">
												<select bind:value={row.program} class={sel}>
													<option value="FMBA">FMBA</option>
													<option value="MMS">MMS</option>
													<option value="unknown">—</option>
												</select>
											</td>
											<td class="px-1 py-1.5"><input bind:value={row.instructor} class={inp} placeholder="Name" /></td>
											<td class="px-1 py-1.5">
												<select bind:value={row.days} class={sel}>
													<option value="">— select —</option>
													{#each DAY_OPTIONS as opt}<option value={opt.label}>{opt.label}</option>{/each}
												</select>
											</td>
											<td class="px-1 py-1.5 space-y-1">
												{#each row.timeBlocks as block, blockIdx}
													<div class="flex items-center gap-1">
														<select bind:value={block.startTime} class="{sel} w-20">
															<option value="">start</option>
															{#each TIME_OPTIONS as t}<option value={t}>{t}</option>{/each}
														</select>
														<span class="text-muted-foreground shrink-0">–</span>
														<select bind:value={block.endTime} class="{sel} w-20">
															<option value="">end</option>
															{#each TIME_OPTIONS as t}<option value={t}>{t}</option>{/each}
														</select>
														{#if row.timeBlocks.length > 1}
															<button onclick={() => removeBlock(groupIdx, rowIdx, blockIdx)} class="shrink-0 text-muted-foreground hover:text-red-500 font-bold px-0.5">−</button>
														{/if}
													</div>
												{/each}
												<button onclick={() => addBlock(groupIdx, rowIdx)} class="text-primary hover:underline leading-none mt-0.5">+ block</button>
											</td>
											<td class="px-1 py-1.5"><input bind:value={row.room} class={inp} placeholder="9B114" /></td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
						<button onclick={() => addRow(groupIdx)} class="text-xs text-primary border border-primary/30 hover:bg-primary/5 rounded-lg px-3 py-1.5">+ Add course</button>
					</div>
				{/each}

				<div class="flex gap-3 pt-2">
					<button onclick={reset} class="flex-1 border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-muted/50">Re-upload</button>
					<button onclick={publish} class="flex-1 bg-green-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-green-700">Publish to both apps</button>
				</div>
			</div>

		{:else if step === 'publishing' || step === 'done'}
			<div class="space-y-4">
				<h2 class="font-semibold">Publishing {selectedLabels}...</h2>
				{#each publishLog as entry}
					<div class="flex items-center gap-3 border rounded-lg p-3">
						{#if entry.status === 'pending'}
							<div class="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
						{:else if entry.status === 'success'}
							<span class="text-green-600 text-lg">✓</span>
						{:else}
							<span class="text-red-600 text-lg">✗</span>
						{/if}
						<div class="flex-1">
							<p class="text-sm font-medium">{entry.repo}</p>
							{#if entry.status === 'error' && entry.message}<p class="text-xs text-red-600">{entry.message}</p>{/if}
						</div>
					</div>
				{/each}
				{#if step === 'done'}
					{#if publishLog.every(e => e.status === 'success')}
						<div class="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-800">
							<strong>Published successfully!</strong> Both apps will rebuild automatically in ~2 minutes.
						</div>
					{:else}
						<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
							Some repos failed. Check that your GitHub token has write access to both repos.
						</div>
					{/if}
					<button onclick={reset} class="w-full border rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-muted/50">Upload another semester</button>
				{/if}
			</div>
		{/if}
	{/if}
</div>
