// @ Assignment type and scope classifier
// # Purpose: Determine if assignment is in-class, take-home, required, optional, etc.

// / Classification result
export interface AssignmentClassification {
	scope: 'in-class' | 'take-home' | 'before-class' | 'unknown';
	requirement: 'required' | 'optional' | 'unknown';
	scopeConfidence: 'high' | 'medium' | 'low';
	requirementConfidence: 'high' | 'medium' | 'low';
	reasoning: string[];
}

// @ Keywords for different assignment scopes
const SCOPE_KEYWORDS = {
	inClass: [
		'in-class',
		'in class',
		'in-classroom',
		'during class',
		'during the class',
		'classroom',
		'in person',
		'face-to-face',
		'group activity',
		'group work',
		'class activity',
		'classwork',
		'in-session',
	],
	takeHome: [
		'take-home',
		'take home',
		'homework',
		'home work',
		'at home',
		'outside of class',
		'outside class',
		'independent',
		'individually',
		'on your own',
		'submit',
		'turn in',
		'hand in',
		'email',
		'online submission',
	],
	beforeClass: [
		'before class',
		'before the class',
		'prior to class',
		'before coming to class',
		'preparation',
		'prepare for class',
		'pre-class',
		'preclass',
		'reading',
		'review',
		'watch',
		'listen',
	],
};

// @ Keywords for requirement level
const REQUIREMENT_KEYWORDS = {
	required: [
		'required',
		'must',
		'mandatory',
		'compulsory',
		'will be graded',
		'count toward',
		'points',
		'grade',
		'evaluated',
		'assessment',
	],
	optional: [
		'optional',
		'may',
		'might',
		'can',
		'could',
		'extra credit',
		'bonus',
		'suggested',
		'recommended',
		'encouraged',
		'voluntary',
		'choose',
		'for those',
		'if interested',
	],
};

// / Classify assignment based on context
export function classifyAssignment(
	assignmentName: string,
	assignmentContext: string,
	nearbyLines: string[]
): AssignmentClassification {
	const reasoning: string[] = [];
	let scope: 'in-class' | 'take-home' | 'before-class' | 'unknown' = 'unknown';
	let requirement: 'required' | 'optional' | 'unknown' = 'unknown';
	let scopeConfidence: 'high' | 'medium' | 'low' = 'low';
	let requirementConfidence: 'high' | 'medium' | 'low' = 'low';

	// # Combine all relevant text for analysis
	const fullText = (assignmentName + ' ' + assignmentContext + ' ' + nearbyLines.join(' ')).toLowerCase();

	// @ Detect scope
	const inClassCount = countKeywordMatches(fullText, SCOPE_KEYWORDS.inClass);
	const takeHomeCount = countKeywordMatches(fullText, SCOPE_KEYWORDS.takeHome);
	const beforeClassCount = countKeywordMatches(fullText, SCOPE_KEYWORDS.beforeClass);

	const maxScopeCount = Math.max(inClassCount, takeHomeCount, beforeClassCount);

	if (maxScopeCount > 0) {
		if (inClassCount === maxScopeCount && inClassCount > 0) {
			scope = 'in-class';
			scopeConfidence = inClassCount >= 2 ? 'high' : 'medium';
			reasoning.push(`Found ${inClassCount} in-class indicators`);
		} else if (takeHomeCount === maxScopeCount && takeHomeCount > 0) {
			scope = 'take-home';
			scopeConfidence = takeHomeCount >= 2 ? 'high' : 'medium';
			reasoning.push(`Found ${takeHomeCount} take-home/independent indicators`);
		} else if (beforeClassCount === maxScopeCount && beforeClassCount > 0) {
			scope = 'before-class';
			scopeConfidence = beforeClassCount >= 2 ? 'high' : 'medium';
			reasoning.push(`Found ${beforeClassCount} before-class preparation indicators`);
		}
	}

	// @ Detect requirement level
	const requiredCount = countKeywordMatches(fullText, REQUIREMENT_KEYWORDS.required);
	const optionalCount = countKeywordMatches(fullText, REQUIREMENT_KEYWORDS.optional);

	const maxReqCount = Math.max(requiredCount, optionalCount);

	if (maxReqCount > 0) {
		if (requiredCount === maxReqCount && requiredCount > 0) {
			requirement = 'required';
			requirementConfidence = requiredCount >= 2 ? 'high' : 'medium';
			reasoning.push(`Found ${requiredCount} required/mandatory indicators`);
		} else if (optionalCount === maxReqCount && optionalCount > 0) {
			requirement = 'optional';
			requirementConfidence = optionalCount >= 2 ? 'high' : 'medium';
			reasoning.push(`Found ${optionalCount} optional/suggested indicators`);
		}
	}

	// @ Apply context rules
	// # If in a section clearly labeled "optional" or "extra credit"
	if (fullText.includes('extra credit') || fullText.includes('optional section')) {
		requirement = 'optional';
		requirementConfidence = 'high';
		reasoning.push('Assignment appears in optional or extra credit section');
	}

	// # If it's a group activity, likely in-class
	if (fullText.includes('group') && scope === 'unknown') {
		scope = 'in-class';
		scopeConfidence = 'medium';
		reasoning.push('Group work typically completed in-class');
	}

	// # If before-class preparation but no explicit "before", infer from context
	if (scope === 'unknown' && (fullText.includes('reading') || fullText.includes('watch'))) {
		scope = 'before-class';
		scopeConfidence = 'medium';
		reasoning.push('Reading/preparation activities typically done before class');
	}

	return {
		scope,
		requirement,
		scopeConfidence,
		requirementConfidence,
		reasoning,
	};
}

// / Count how many keywords from a list are found in text
function countKeywordMatches(text: string, keywords: string[]): number {
	let count = 0;
	keywords.forEach((keyword) => {
		// / Use word boundaries to match whole words/phrases
		const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
		const matches = text.match(regex);
		if (matches) {
			count += matches.length;
		}
	});
	return count;
}

// / Get confidence adjustment based on classification
// @ Used by contextAnalyzer to adjust confidence scores
export function getClassificationConfidenceAdjustment(
	classification: AssignmentClassification
): {
	adjustment: 'boost' | 'maintain' | 'downgrade';
	factor: number;
	reason: string;
} {
	// # If clearly identified scope and requirement, boost confidence
	if (classification.scopeConfidence === 'high' && classification.requirementConfidence === 'high') {
		return {
			adjustment: 'boost',
			factor: 1.15,
			reason: 'Clear classification (scope and requirement both high confidence)',
		};
	}

	// @ If scope is clear (in-class likely means definite date), boost
	if (
		classification.scope === 'in-class' &&
		classification.scopeConfidence === 'high'
	) {
		return {
			adjustment: 'boost',
			factor: 1.1,
			reason: 'In-class activity - high likelihood of scheduled date',
		};
	}

	// # If optional with low requirement confidence, downgrade
	if (
		classification.requirement === 'optional' &&
		classification.requirementConfidence === 'high'
	) {
		return {
			adjustment: 'downgrade',
			factor: 0.85,
			reason: 'Assignment is optional - may not need strict calendar entry',
		};
	}

	// @ If before-class prep, boost (more likely to have specific date)
	if (
		classification.scope === 'before-class' &&
		classification.scopeConfidence === 'high'
	) {
		return {
			adjustment: 'boost',
			factor: 1.1,
			reason: 'Before-class preparation - typically has specific date',
		};
	}

	// Default: maintain current confidence
	return {
		adjustment: 'maintain',
		factor: 1.0,
		reason: 'Insufficient classification data to adjust confidence',
	};
}

// / Get human-readable description of classification
export function getClassificationLabel(classification: AssignmentClassification): string {
	let label = '';

	// Scope
	switch (classification.scope) {
		case 'in-class':
			label += 'In-Class Activity';
			break;
		case 'take-home':
			label += 'Take-Home Work';
			break;
		case 'before-class':
			label += 'Before-Class Prep';
			break;
		default:
			label += 'Unknown Scope';
	}

	// Requirement
	label += ' • ';
	switch (classification.requirement) {
		case 'required':
			label += 'Required';
			break;
		case 'optional':
			label += 'Optional';
			break;
		default:
			label += 'Requirement Unknown';
	}

	return label;
}
