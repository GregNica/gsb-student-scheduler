// Tests for the pure date-parsing utilities exported from pdfGridParser.ts.
// These functions have no browser dependencies (no pdfjs-dist at runtime).
// The module-level pdfjsLib import in pdfGridParser.ts is mocked out below
// so Vitest never tries to load the worker binary.

import { describe, it, expect, vi } from 'vitest';

// Mock pdfjs-dist before importing our module so the worker setup line
// ("pdfjsLib.GlobalWorkerOptions.workerSrc = ...") doesn't throw in Node.
vi.mock('pdfjs-dist', () => ({
	default: { GlobalWorkerOptions: { workerSrc: '' } },
	GlobalWorkerOptions: { workerSrc: '' },
	getDocument: vi.fn(),
}));

// Also mock the visual extractor (imports canvas-dependent pdfjs internals)
vi.mock('../pdfVisualBlockExtractor', () => ({
	extractPageRectangles: vi.fn(),
	colorsMatch: vi.fn(),
	isNearWhite: vi.fn(),
}));

import { parseSubtitleDate, formatISO, parseSubtitleDateRanges } from '../pdfGridParser';

// ---------------------------------------------------------------------------
// formatISO
// ---------------------------------------------------------------------------

describe('formatISO', () => {
	it('formats January correctly with zero-padding', () => {
		expect(formatISO(new Date(2026, 0, 1))).toBe('2026-01-01');
	});

	it('formats December 31 correctly', () => {
		expect(formatISO(new Date(2026, 11, 31))).toBe('2026-12-31');
	});

	it('zero-pads single-digit month and day', () => {
		expect(formatISO(new Date(2026, 2, 5))).toBe('2026-03-05');
	});
});

// ---------------------------------------------------------------------------
// parseSubtitleDate
// ---------------------------------------------------------------------------

describe('parseSubtitleDate', () => {
	it('parses Jan 12 correctly', () => {
		const result = parseSubtitleDate('Jan 12', 2026);
		expect(result).not.toBeNull();
		expect(formatISO(result!)).toBe('2026-01-12');
	});

	it('parses Feb 27 correctly', () => {
		const result = parseSubtitleDate('Feb 27', 2026);
		expect(formatISO(result!)).toBe('2026-02-27');
	});

	it('parses Mar 2 correctly', () => {
		const result = parseSubtitleDate('Mar 2', 2026);
		expect(formatISO(result!)).toBe('2026-03-02');
	});

	it('parses Oct 16 correctly', () => {
		const result = parseSubtitleDate('Oct 16', 2026);
		expect(formatISO(result!)).toBe('2026-10-16');
	});

	it('is case-insensitive for month abbreviation', () => {
		const result = parseSubtitleDate('dec 31', 2025);
		expect(formatISO(result!)).toBe('2025-12-31');
	});

	it('returns null for an unknown month abbreviation', () => {
		expect(parseSubtitleDate('XYZ 10', 2026)).toBeNull();
	});

	it('returns null for empty string', () => {
		expect(parseSubtitleDate('', 2026)).toBeNull();
	});

	it('returns null for text without a date pattern', () => {
		expect(parseSubtitleDate('some random text', 2026)).toBeNull();
	});

	it('returns null for full month names (only 3-letter abbrevs supported)', () => {
		// The MONTH_MAP only has 3-letter keys — "January" would not match
		expect(parseSubtitleDate('January 15', 2026)).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// parseSubtitleDateRanges
// ---------------------------------------------------------------------------

describe('parseSubtitleDateRanges', () => {
	it('returns empty array for text with no period label', () => {
		expect(parseSubtitleDateRanges('Some random text', 2026)).toEqual([]);
	});

	it('returns empty array for empty string', () => {
		expect(parseSubtitleDateRanges('', 2026)).toEqual([]);
	});

	it('parses Sp1 simple range', () => {
		const ranges = parseSubtitleDateRanges('Sp1 : Jan 12 - Feb 27', 2026);
		expect(ranges).toHaveLength(1);
		expect(ranges[0]).toMatchObject({ start: '2026-01-12', end: '2026-02-27', label: 'Sp1' });
	});

	it('parses Sp2 range', () => {
		const ranges = parseSubtitleDateRanges('Sp2 : Mar 23 - May 1', 2026);
		expect(ranges).toHaveLength(1);
		expect(ranges[0]).toMatchObject({ start: '2026-03-23', end: '2026-05-01', label: 'Sp2' });
	});

	it('splits Sp1 range around a parenthetical break (Lunar New Year)', () => {
		const text = 'Sp1 : Jan 12 - Feb 27 (Lunar New Year Break: Feb 16 - 20)';
		const ranges = parseSubtitleDateRanges(text, 2026);
		// Expects two ranges: Jan 12–Feb 15 and Feb 21–Feb 27
		expect(ranges).toHaveLength(2);
		expect(ranges[0]).toMatchObject({ start: '2026-01-12', end: '2026-02-15', label: 'Sp1' });
		expect(ranges[1]).toMatchObject({ start: '2026-02-21', end: '2026-02-27', label: 'Sp1' });
	});

	it('parses SpIW slash format into SpIW1 and SpIW2 sub-labels', () => {
		const text = 'SpIW : First Intensive Mar 2 - 6 / Break Mar 9 - 13 / Second Intensive Mar 16 - 20';
		const ranges = parseSubtitleDateRanges(text, 2026);
		expect(ranges).toHaveLength(2);
		expect(ranges[0]).toMatchObject({ start: '2026-03-02', end: '2026-03-06', label: 'SpIW1' });
		expect(ranges[1]).toMatchObject({ start: '2026-03-16', end: '2026-03-20', label: 'SpIW2' });
	});

	it('parses FIW slash format into FIW1 and FIW2 sub-labels', () => {
		const text = 'FIW : First Intensive Oct 12 - 16 / Break Oct 20 - 24 / Second Intensive Oct 26 - 30';
		const ranges = parseSubtitleDateRanges(text, 2026);
		expect(ranges).toHaveLength(2);
		expect(ranges[0]).toMatchObject({ start: '2026-10-12', end: '2026-10-16', label: 'FIW1' });
		expect(ranges[1]).toMatchObject({ start: '2026-10-26', end: '2026-10-30', label: 'FIW2' });
	});

	it('parses Su (Summer) range', () => {
		const ranges = parseSubtitleDateRanges('Su : May 11 - Jun 19', 2026);
		expect(ranges).toHaveLength(1);
		expect(ranges[0]).toMatchObject({ start: '2026-05-11', end: '2026-06-19', label: 'Su' });
	});

	it('parses GFT range', () => {
		const ranges = parseSubtitleDateRanges('GFT : May 4 - May 8', 2026);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].label).toBe('GFT');
	});

	it('skips break-only slash segments', () => {
		// A segment that is just "Break" with no period label should produce no range
		const text = 'SpIW : First Intensive Mar 2 - 6 / Break / Second Intensive Mar 16 - 20';
		const ranges = parseSubtitleDateRanges(text, 2026);
		expect(ranges.every(r => r.label !== undefined)).toBe(true);
		// Break segment should not produce a range
		expect(ranges).toHaveLength(2);
	});
});
