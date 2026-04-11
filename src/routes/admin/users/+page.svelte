<script lang="ts">
	import * as XLSX from 'xlsx';

	let { data } = $props();
	let users: { email: string; role: string }[] = $state(data.users);
	let newEmail = $state('');
	let newRole: 'student' | 'professor' | 'admin' = $state('student');
	let error = $state('');
	let success = $state('');
	let bulkFile: File | null = $state(null);
	let bulkPreview: { email: string; role: string; valid: boolean; reason?: string }[] = $state([]);
	let bulkError = $state('');
	let isBulkLoading = $state(false);

	async function addUser() {
		error = ''; success = '';
		if (!newEmail.includes('@')) { error = 'Enter a valid email'; return; }
		const res = await fetch('/api/admin/users', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email: newEmail.trim().toLowerCase(), role: newRole })
		});
		if (!res.ok) { error = await res.text(); return; }
		const key = newEmail.trim().toLowerCase();
		users = [...users.filter(u => u.email !== key), { email: key, role: newRole }];
		success = `${key} added as ${newRole}`;
		newEmail = '';
	}

	async function removeUser(email: string) {
		error = ''; success = '';
		const res = await fetch('/api/admin/users', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email })
		});
		if (!res.ok) { error = await res.text(); return; }
		users = users.filter(u => u.email !== email);
	}

	async function changeRole(email: string, role: string) {
		await fetch('/api/admin/users', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ email, role })
		});
		users = users.map(u => u.email === email ? { ...u, role } : u);
	}

	function downloadTemplate() {
		const ws = XLSX.utils.aoa_to_sheet([
			['email', 'role'],
			['student@skku.edu', 'student'],
			['professor@skku.edu', 'professor'],
		]);
		ws['!cols'] = [{ wch: 40 }, { wch: 12 }];
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'Users');
		XLSX.writeFile(wb, 'gsb-users-template.xlsx');
	}

	function handleBulkFile(e: Event) {
		bulkError = ''; bulkPreview = [];
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		bulkFile = file;
		const reader = new FileReader();
		reader.onload = (ev) => {
			try {
				const wb = XLSX.read(ev.target?.result, { type: 'binary' });
				const ws = wb.Sheets[wb.SheetNames[0]];
				const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
				bulkPreview = rows.map(row => {
					const email = String(row['email'] ?? row['Email'] ?? '').trim().toLowerCase();
					const role = String(row['role'] ?? row['Role'] ?? 'student').trim().toLowerCase();
					const validRoles = ['student', 'professor', 'admin'];
					if (!email.includes('@')) return { email, role, valid: false, reason: 'Invalid email' };
					if (!validRoles.includes(role)) return { email, role, valid: false, reason: `Unknown role "${role}" — use student, professor, or admin` };
					return { email, role, valid: true };
				});
				if (bulkPreview.length === 0) bulkError = 'No rows found in file';
			} catch (e) {
				bulkError = 'Could not read file. Make sure it is a valid Excel (.xlsx) file.';
			}
		};
		reader.readAsBinaryString(file);
	}

	async function bulkImport() {
		isBulkLoading = true; error = ''; success = '';
		const valid = bulkPreview.filter(r => r.valid);
		let added = 0;
		for (const u of valid) {
			const res = await fetch('/api/admin/users', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: u.email, role: u.role })
			});
			if (res.ok) {
				added++;
				users = [...users.filter(x => x.email !== u.email), { email: u.email, role: u.role }];
			}
		}
		success = `${added} user${added !== 1 ? 's' : ''} imported successfully`;
		bulkPreview = []; bulkFile = null;
		isBulkLoading = false;
	}
</script>

<div class="space-y-8">
	<div class="border-b pb-4">
		<h1 class="text-xl font-bold">User Management</h1>
		<p class="text-sm text-muted-foreground mt-1">Only emails listed here can log in (besides your admin email).</p>
	</div>

	{#if error}<p class="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</p>{/if}
	{#if success}<p class="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">{success}</p>{/if}

	<!-- Add single user -->
	<div class="space-y-3 max-w-xl">
		<h2 class="font-semibold text-sm">Add Single User</h2>
		<div class="flex gap-2">
			<input bind:value={newEmail} type="email" placeholder="user@skku.edu"
				class="flex-1 border rounded-lg px-3 py-2 text-sm bg-background"
				onkeydown={(e) => e.key === 'Enter' && addUser()} />
			<select bind:value={newRole} class="border rounded-lg px-3 py-2 text-sm bg-background">
				<option value="student">Student</option>
				<option value="professor">Professor</option>
				<option value="admin">Admin</option>
			</select>
			<button onclick={addUser} class="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:opacity-90">Add</button>
		</div>
	</div>

	<!-- Bulk import -->
	<div class="space-y-3 max-w-xl">
		<h2 class="font-semibold text-sm">Bulk Import</h2>
		<div class="flex gap-2 items-center">
			<button onclick={downloadTemplate}
				class="text-sm border rounded-lg px-3 py-2 hover:bg-muted transition-colors">
				Download Excel Template
			</button>
			<span class="text-xs text-muted-foreground">→ Fill in emails & roles, then upload below</span>
		</div>
		<div class="flex gap-2 items-center">
			<input type="file" accept=".xlsx,.xls" onchange={handleBulkFile}
				class="text-sm text-muted-foreground file:mr-3 file:border file:rounded file:px-3 file:py-1 file:text-sm file:bg-background file:cursor-pointer" />
		</div>
		{#if bulkError}<p class="text-sm text-red-600">{bulkError}</p>{/if}
		{#if bulkPreview.length > 0}
			<div class="border rounded-lg overflow-hidden">
				<div class="bg-muted/50 px-3 py-2 flex items-center justify-between">
					<span class="text-xs font-medium">{bulkPreview.filter(r => r.valid).length} valid / {bulkPreview.filter(r => !r.valid).length} invalid</span>
					<button onclick={bulkImport} disabled={isBulkLoading || bulkPreview.filter(r => r.valid).length === 0}
						class="text-xs bg-primary text-primary-foreground rounded px-3 py-1 hover:opacity-90 disabled:opacity-50">
						{isBulkLoading ? 'Importing...' : `Import ${bulkPreview.filter(r => r.valid).length} users`}
					</button>
				</div>
				<table class="w-full text-xs">
					<thead class="border-b bg-muted/30">
						<tr>
							<th class="text-left px-3 py-1.5 font-medium">Email</th>
							<th class="text-left px-3 py-1.5 font-medium w-24">Role</th>
							<th class="text-left px-3 py-1.5 font-medium w-20">Status</th>
						</tr>
					</thead>
					<tbody>
						{#each bulkPreview as row}
							<tr class="border-t {row.valid ? '' : 'bg-red-50'}">
								<td class="px-3 py-1.5">{row.email || '(empty)'}</td>
								<td class="px-3 py-1.5">{row.role}</td>
								<td class="px-3 py-1.5">
									{#if row.valid}
										<span class="text-green-600">✓</span>
									{:else}
										<span class="text-red-600" title={row.reason}>✗ {row.reason}</span>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Current users table -->
	<div class="space-y-2">
		<h2 class="font-semibold text-sm">Allowed Users ({users.length})</h2>
		{#if users.length === 0}
			<p class="text-sm text-muted-foreground">No users added yet.</p>
		{:else}
			<div class="border rounded-lg overflow-hidden max-w-xl">
				<table class="w-full text-sm">
					<thead class="bg-muted/50">
						<tr>
							<th class="text-left px-4 py-2 font-medium">Email</th>
							<th class="text-left px-4 py-2 font-medium w-36">Role</th>
							<th class="w-20 px-4 py-2"></th>
						</tr>
					</thead>
					<tbody>
						{#each users as u}
							<tr class="border-t">
								<td class="px-4 py-2 text-sm">{u.email}</td>
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
