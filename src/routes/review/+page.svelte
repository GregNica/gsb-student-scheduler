<script lang="ts">
	// @ Review page for validating scanned assignments
	// # Purpose: Allow students to review, edit, and confirm assignments before adding to calendar

	import { Card } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import TrashIcon from '@lucide/svelte/icons/trash-2';
	import AlertCircleIcon from '@lucide/svelte/icons/alert-circle';
	import CheckCircleIcon from '@lucide/svelte/icons/check-circle';
	import HelpCircleIcon from '@lucide/svelte/icons/help-circle';
	import { goto } from '$app/navigation';
	import {
		getReviewSession,
		updateAssignmentInReview,
		deleteAssignmentFromReview,
		addNewAssignmentToReview,
		clearReviewSession,
		getConfidenceExplanation,
		getReviewStats,
		type ReviewedAssignment,
	} from '$lib/utils/reviewStorage';

	// @ State variables
	let session = $state(getReviewSession());
	let showAddForm = $state(false);
	let showConfidenceExplanation = $state<string | null>(null);
	let newAssignment = $state({
		name: '',
		type: '',
		dueDate: '',
		description: '',
		confidence: 'high' as const,
	});

	// # Check if user is on the review page (has a session)
	$effect(() => {
		if (!session) {
			goto('/upload');
		}
	});

	// / Handle assignment field updates
	function handleAssignmentChange(
		assignmentId: string,
		field: keyof ReviewedAssignment,
		value: string
	) {
		if (!session) return;

		const assignment = session.assignments.find((a) => a.id === assignmentId);
		if (assignment) {
			(assignment[field] as string) = value;
			updateAssignmentInReview(assignmentId, assignment);
		}
	}

	// / Delete an assignment
	function handleDelete(assignmentId: string) {
		if (!session) return;

		if (confirm('Are you sure you want to delete this assignment?')) {
			deleteAssignmentFromReview(assignmentId);
			session.assignments = session.assignments.filter((a) => a.id !== assignmentId);
		}
	}

	// / Add new assignment
	function handleAddAssignment() {
		if (!newAssignment.name.trim() || !newAssignment.dueDate.trim()) {
			alert('Please enter both assignment name and due date');
			return;
		}

		if (!session) return;

		const assignmentToAdd: Omit<ReviewedAssignment, 'id'> = {
			...newAssignment,
			requiresReview: true,
			reasons: ['Manually added by user'],
			sourceLineNumbers: [],
			confidenceColor: 'gray',
		} as any;

		if (addNewAssignmentToReview(assignmentToAdd)) {
			// Reset form
			newAssignment = {
				name: '',
				type: '',
				dueDate: '',
				description: '',
				confidence: 'high' as const,
			};
			showAddForm = false;

			// Refresh session
			session = getReviewSession();
		}
	}

	// / Go back to upload
	function handleGoBack() {
		clearReviewSession();
		goto('/upload');
	}

	// / Confirm and proceed to calendar
	function handleConfirm() {
		if (!session) return;

		// TODO: Save to localStorage and navigate to calendar preview
		goto('/calendar-preview');
	}

	// / Get stats
	let stats = $derived(session ? getReviewStats(session) : null);
</script>


<!-- # Review page content -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
<div class="max-w-6xl mx-auto space-y-6">
{#if session}
<!-- @ Header with stats -->
<div class="space-y-4">
<div class="flex items-center justify-between">
<div>
<h1 class="text-3xl font-bold">Review Assignments</h1>
<p class="text-muted-foreground mt-2">
Found {session.assignments.length} assignment{session.assignments.length !== 1 ? 's' : ''} in your syllabus
</p>
</div>
<Button onclick={handleGoBack} variant="outline">← Back</Button>
</div>

<!-- # Stats cards -->
{#if stats}
<div class="grid grid-cols-2 md:grid-cols-5 gap-4">
<Card class="p-4">
<div class="text-sm text-muted-foreground">Total</div>
<div class="text-2xl font-bold">{stats.total}</div>
</Card>
<Card class="p-4 border-green-200">
<div class="text-sm text-green-600">High</div>
<div class="text-2xl font-bold text-green-600">{stats.highConfidence}</div>
</Card>
<Card class="p-4 border-yellow-200">
<div class="text-sm text-yellow-600">Medium</div>
<div class="text-2xl font-bold text-yellow-600">{stats.mediumConfidence}</div>
</Card>
<Card class="p-4 border-red-200">
<div class="text-sm text-red-600">Low</div>
<div class="text-2xl font-bold text-red-600">{stats.lowConfidence}</div>
</Card>
<Card class="p-4 border-blue-200">
<div class="text-sm text-blue-600">Review</div>
<div class="text-2xl font-bold text-blue-600">{stats.flaggedForReview}</div>
</Card>
</div>
{/if}
</div>

<!-- @ Assignments table -->
<Card class="p-6">
<h2 class="text-xl font-semibold mb-4">Assignments</h2>
<div class="overflow-x-auto">
<table class="w-full text-sm">
<thead class="border-b">
<tr>
<th class="text-left py-2 px-3 font-semibold">Assignment</th>
<th class="text-left py-2 px-3 font-semibold">Description</th>
<th class="text-left py-2 px-3 font-semibold">Due Date</th>
<th class="text-left py-2 px-3 font-semibold">Confidence</th>
<th class="text-left py-2 px-3 font-semibold">Actions</th>
</tr>
</thead>
<tbody>
{#each session.assignments as assignment (assignment.id)}
<tr class="border-b hover:bg-slate-50 dark:hover:bg-slate-800">
<td class="py-3 px-3">
<Input
type="text"
value={assignment.name}
onchange={(e) =>
handleAssignmentChange(assignment.id, 'name', e.currentTarget.value)}
class="w-full"
/>
</td>
<td class="py-3 px-3">
<Input
type="text"
value={assignment.description || ''}
onchange={(e) =>
handleAssignmentChange(assignment.id, 'description', e.currentTarget.value)}
class="w-full"
placeholder="Add description..."
/>
</td>
<td class="py-3 px-3">
<Input
type="date"
value={assignment.dueDate}
onchange={(e) =>
handleAssignmentChange(assignment.id, 'dueDate', e.currentTarget.value)}
class="w-full"
/>
</td>
<td class="py-3 px-3">
<button
class="text-xs px-2 py-1 rounded {assignment.confidence === 'high'
? 'bg-green-100 text-green-700'
: assignment.confidence === 'medium'
? 'bg-yellow-100 text-yellow-700'
: 'bg-red-100 text-red-700'}"
onclick={() =>
(showConfidenceExplanation =
showConfidenceExplanation === assignment.id ? null : assignment.id)}
>
{assignment.confidence}
</button>
{#if showConfidenceExplanation === assignment.id}
{@const explanation = getConfidenceExplanation(assignment.confidence)}
<div class="mt-2 text-xs bg-blue-50 dark:bg-blue-950 p-2 rounded border border-blue-200 dark:border-blue-800">
<p class="font-semibold">{explanation.title}</p>
<p class="text-blue-700 dark:text-blue-300">{explanation.description}</p>
</div>
{/if}
</td>
<td class="py-3 px-3">
<Button
onclick={() => handleDelete(assignment.id)}
variant="ghost"
size="sm"
class="text-red-600 hover:bg-red-50"
>
<TrashIcon class="w-4 h-4" />
</Button>
</td>
</tr>
{/each}
</tbody>
</table>
</div>
</Card>

<!-- @ Add new assignment section -->
<Card class="p-6">
<div class="flex items-center justify-between mb-4">
<h2 class="text-xl font-semibold">Add Assignment</h2>
<Button
onclick={() => (showAddForm = !showAddForm)}
variant="outline"
size="sm"
>
{showAddForm ? '✕ Cancel' : '+ Add'}
</Button>
</div>

{#if showAddForm}
<div class="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
<div class="space-y-2">
<Label for="newName">Assignment Name</Label>
<Input
id="newName"
bind:value={newAssignment.name}
placeholder="e.g., Chapter 1-3 Quiz"
/>
</div>
<div class="space-y-2">
<Label for="newType">Type (Optional)</Label>
<Input
id="newType"
bind:value={newAssignment.type}
placeholder="e.g., Quiz, Assignment"
/>
</div>
<div class="space-y-2">
<Label for="newDate">Due Date</Label>
<Input
id="newDate"
type="date"
bind:value={newAssignment.dueDate}
/>
</div>
<div class="space-y-2">
<Label for="newConfidence">Confidence</Label>
<select
id="newConfidence"
bind:value={newAssignment.confidence}
class="w-full px-3 py-2 border border-input rounded-md"
>
<option value="high">High</option>
<option value="medium">Medium</option>
<option value="low">Low</option>
</select>
</div>
<div class="md:col-span-2 space-y-2">
<Label for="newDesc">Description (Optional)</Label>
<Textarea
id="newDesc"
bind:value={newAssignment.description}
placeholder="Add any additional details"
rows={2}
/>
</div>
<div class="md:col-span-2">
<Button onclick={handleAddAssignment} class="w-full">
Add Assignment
</Button>
</div>
</div>
{/if}
</Card>

<!-- @ Action buttons -->
<div class="flex gap-4 justify-between">
<Button onclick={handleGoBack} variant="outline">Back to Upload</Button>
<Button onclick={handleConfirm} class="bg-green-600 hover:bg-green-700">
Continue to Calendar →
</Button>
</div>
{/if}
</div>
</div>

