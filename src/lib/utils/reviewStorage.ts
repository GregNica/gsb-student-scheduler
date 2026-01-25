// @ Review session storage utility
// # Purpose: Manage the temporary review session where users validate scan results

import type { ScannedAssignment } from './assignmentAggregator';
import type { ScannerResult } from './syllabusScannerMain';

// / Structure of an assignment in review
export interface ReviewedAssignment extends ScannedAssignment {
	// Extends ScannedAssignment with all its properties
}

// / Structure of a review session
export interface ReviewSession {
	scanResult: ScannerResult;
	assignments: ReviewedAssignment[];
	editedByUser: Record<string, boolean>; // Track which assignments were edited
	timestamp: number;
}

// / Store scan results in sessionStorage for the review page
export function storeScanResults(scanResult: ScannerResult): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	try {
		const session: ReviewSession = {
			scanResult,
			assignments: scanResult.assignments as ReviewedAssignment[],
			editedByUser: {},
			timestamp: Date.now(),
		};

		sessionStorage.setItem('reviewSession', JSON.stringify(session));
		return true;
	} catch (error) {
		console.error('Error storing scan results:', error);
		return false;
	}
}

// / Get the current review session
export function getReviewSession(): ReviewSession | null {
	if (typeof window === 'undefined') {
		return null;
	}

	try {
		const stored = sessionStorage.getItem('reviewSession');
		if (stored) {
			return JSON.parse(stored);
		}
	} catch (error) {
		console.error('Error retrieving review session:', error);
	}

	return null;
}

// / Update an assignment in the review session
export function updateAssignmentInReview(
	assignmentId: string,
	updates: Partial<ReviewedAssignment>
): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	try {
		const session = getReviewSession();
		if (!session) {
			return false;
		}

		const index = session.assignments.findIndex((a) => a.id === assignmentId);
		if (index === -1) {
			return false;
		}

		session.assignments[index] = {
			...session.assignments[index],
			...updates,
		};

		// # Mark as edited by user
		session.editedByUser[assignmentId] = true;

		sessionStorage.setItem('reviewSession', JSON.stringify(session));
		return true;
	} catch (error) {
		console.error('Error updating assignment:', error);
		return false;
	}
}

// / Delete an assignment from the review session
export function deleteAssignmentFromReview(assignmentId: string): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	try {
		const session = getReviewSession();
		if (!session) {
			return false;
		}

		session.assignments = session.assignments.filter((a) => a.id !== assignmentId);
		sessionStorage.setItem('reviewSession', JSON.stringify(session));
		return true;
	} catch (error) {
		console.error('Error deleting assignment:', error);
		return false;
	}
}

// / Add a new manually-created assignment to the review session
export function addNewAssignmentToReview(assignment: Omit<ReviewedAssignment, 'id'>): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	try {
		const session = getReviewSession();
		if (!session) {
			return false;
		}

		const newAssignment: ReviewedAssignment = {
			...assignment,
			id: `manual-${Date.now()}-${Math.random().toString(36).substring(7)}`,
		} as ReviewedAssignment;

		session.assignments.push(newAssignment);
		sessionStorage.setItem('reviewSession', JSON.stringify(session));
		return true;
	} catch (error) {
		console.error('Error adding assignment:', error);
		return false;
	}
}

// / Clear the review session
export function clearReviewSession(): boolean {
	if (typeof window === 'undefined') {
		return false;
	}

	try {
		sessionStorage.removeItem('reviewSession');
		return true;
	} catch (error) {
		console.error('Error clearing review session:', error);
		return false;
	}
}

// / Get statistics about assignments
export function getReviewStats(session: ReviewSession) {
	const stats = {
		total: session.assignments.length,
		highConfidence: 0,
		mediumConfidence: 0,
		lowConfidence: 0,
		flaggedForReview: 0,
	};

	session.assignments.forEach((assignment) => {
		if (assignment.confidence === 'high') stats.highConfidence++;
		if (assignment.confidence === 'medium') stats.mediumConfidence++;
		if (assignment.confidence === 'low') stats.lowConfidence++;
		if (assignment.requiresReview) stats.flaggedForReview++;
	});

	return stats;
}

// / Get explanation for confidence levels
export function getConfidenceExplanation(confidence: 'high' | 'medium' | 'low') {
	const explanations = {
		high: {
			title: 'High Confidence',
			description:
				'This assignment was found with clear indicators. The keyword and date were found very close together or in a clear assignment context.',
			suggestions: 'This should be ready to add to your calendar.',
		},
		medium: {
			title: 'Medium Confidence',
			description:
				'This assignment was found with moderate indicators. The keyword and date were within a reasonable distance, but could potentially belong to different assignments.',
			suggestions: 'Review the details and verify the date is correct for this assignment.',
		},
		low: {
			title: 'Low Confidence',
			description:
				'This assignment was found with weak indicators. The keyword and date were far apart in the document, making it unclear if they belong together.',
			suggestions:
				'Carefully verify the date is correct. You may want to search your syllabus manually for this assignment.',
		},
	};

	return explanations[confidence];
}
