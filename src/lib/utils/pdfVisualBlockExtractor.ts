// @ PDF Visual Block Extractor
// # Purpose: Extract filled and bordered rectangles from a PDF page's operator list.
// # These are used by Strategy 3 (extractByVisualBlocks) in pdfGridParser.ts to find
// # course cells by their visual formatting rather than by text patterns alone.
// # Degrades gracefully — returns [] if the PDF has no operator list support.

import * as pdfjsLib from 'pdfjs-dist';
import type { PDFPageProxy } from 'pdfjs-dist/types/src/display/api';

// / An RGB color with components in [0, 1]
export interface RGBColor {
	r: number;
	g: number;
	b: number;
}

// / A rectangle extracted from a PDF page, in the same flipped-Y coordinate system as PositionedText
export interface PdfRect {
	x: number;      // left edge
	y: number;      // top edge (flipped Y — 0 is top of page)
	width: number;
	height: number;
	page: number;
	fillColor: RGBColor | null;    // null if not filled
	strokeColor: RGBColor | null;  // null if not stroked
}

// PathType values used in OPS.constructPath args (PDF.js v4+)
// These are internal to PDF.js path batching and do NOT match OPS enum values.
const PATH_MOVETO = 1;
const PATH_LINETO = 2;
const PATH_CURVETO = 3;
const PATH_CURVETO2 = 4;
const PATH_CURVETO3 = 5;
// const PATH_CLOSEPATH = 6; (0 args — not needed)
const PATH_RECTANGLE = 7;

// Number of coordinate arguments consumed per path command
const PATH_ARG_COUNT: Record<number, number> = {
	[PATH_MOVETO]: 2,
	[PATH_LINETO]: 2,
	[PATH_CURVETO]: 6,
	[PATH_CURVETO2]: 4,
	[PATH_CURVETO3]: 4,
	6: 0, // CLOSEPATH
	[PATH_RECTANGLE]: 4,
};

// / Extract all filled/stroked rectangles from a single PDF page.
// @ Uses page.getOperatorList() to walk the drawing commands.
// @ Coordinates are transformed into the same system as getTextContent() — Y=0 at top.
// @ Returns [] if the page has no rectangles or if the operator list is unavailable.
export async function extractPageRectangles(
	page: PDFPageProxy,
	pageNum: number,
	viewportHeight: number
): Promise<PdfRect[]> {
	// Access OPS constants from pdfjs-dist at runtime
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const OPS = (pdfjsLib as any).OPS as Record<string, number> | undefined;
	if (!OPS) return [];

	let opList: { fnArray: number[]; argsArray: unknown[][] };
	try {
		opList = (await page.getOperatorList()) as typeof opList;
	} catch {
		return [];
	}

	const { fnArray, argsArray } = opList;
	const rects: PdfRect[] = [];

	// Current transformation matrix (CTM) stack — starts as identity [a,b,c,d,e,f]
	const ctmStack: number[][] = [[1, 0, 0, 1, 0, 0]];
	let fillColor: RGBColor | null = null;
	let strokeColor: RGBColor | null = null;
	// Path rectangles waiting to be committed on the next paint operator
	let pendingRects: Array<{ x: number; y: number; w: number; h: number }> = [];

	try {
		for (let i = 0; i < fnArray.length; i++) {
			const fn = fnArray[i];
			const args = argsArray[i] as unknown[];

			if (fn === OPS.save) {
				ctmStack.push([...ctmStack[ctmStack.length - 1]]);
			} else if (fn === OPS.restore) {
				if (ctmStack.length > 1) ctmStack.pop();
			} else if (fn === OPS.transform) {
				// Pre-multiply new transform onto current CTM
				ctmStack[ctmStack.length - 1] = applyTransform(
					ctmStack[ctmStack.length - 1],
					args as number[]
				);
			} else if (fn === OPS.setFillRGBColor) {
				const c = args as number[];
				fillColor = { r: c[0], g: c[1], b: c[2] };
			} else if (fn === OPS.setStrokeRGBColor) {
				const c = args as number[];
				strokeColor = { r: c[0], g: c[1], b: c[2] };
			} else if (fn === OPS.setFillGray) {
				const g = (args as number[])[0];
				fillColor = { r: g, g, b: g };
			} else if (fn === OPS.setStrokeGray) {
				const g = (args as number[])[0];
				strokeColor = { r: g, g, b: g };
			} else if (fn === OPS.setFillCMYKColor) {
				const [c, m, y, k] = args as number[];
				fillColor = cmykToRgb(c, m, y, k);
			} else if (fn === OPS.setStrokeCMYKColor) {
				const [c, m, y, k] = args as number[];
				strokeColor = cmykToRgb(c, m, y, k);
			} else if (fn === OPS.rectangle) {
				// Old-style single rectangle: args = [x, y, w, h]
				const [x, y, w, h] = args as number[];
				pendingRects = [{ x, y, w, h }];
			} else if (fn === OPS.constructPath) {
				// PDF.js v4+ batched paths: args = [cmds: number[]|TypedArray, pathArgs, minMax]
				// Guard against version-specific arg format differences
				pendingRects = [];
				const rawCmds = args[0];
				const rawPathArgs = args[1];
				if (rawCmds == null || rawPathArgs == null) continue;
				// Convert to plain arrays — typed arrays (Uint8Array etc.) need Array.from
				let cmds: number[];
				let pathArgs: number[];
				try {
					cmds = Array.isArray(rawCmds)
						? (rawCmds as number[])
						: Array.from(rawCmds as Iterable<number>);
					pathArgs = Array.isArray(rawPathArgs)
						? (rawPathArgs as number[])
						: Array.from(rawPathArgs as Iterable<number>);
				} catch {
					continue; // args not in expected format for this PDF.js build
				}
				let argIdx = 0;
				for (const cmd of cmds) {
					if (cmd === PATH_RECTANGLE) {
						pendingRects.push({
							x: pathArgs[argIdx],
							y: pathArgs[argIdx + 1],
							w: pathArgs[argIdx + 2],
							h: pathArgs[argIdx + 3],
						});
					}
					argIdx += PATH_ARG_COUNT[cmd] ?? 0;
				}
			} else if (fn === OPS.fill || fn === OPS.eoFill) {
				commitRects(pendingRects, ctmStack, viewportHeight, pageNum, fillColor, null, rects);
				pendingRects = [];
			} else if (fn === OPS.stroke || fn === OPS.closeStroke) {
				commitRects(pendingRects, ctmStack, viewportHeight, pageNum, null, strokeColor, rects);
				pendingRects = [];
			} else if (
				fn === OPS.fillStroke ||
				fn === OPS.eoFillStroke ||
				fn === OPS.closeFillStroke ||
				fn === OPS.closeEOFillStroke
			) {
				commitRects(
					pendingRects, ctmStack, viewportHeight, pageNum, fillColor, strokeColor, rects
				);
				pendingRects = [];
			}
		}
	} catch (err) {
		// Operator list processing failed partway through — return whatever rects we have so far
		console.warn('pdfVisualBlockExtractor: operator list processing error:', err);
	}

	// Filter out degenerate rects (lines, dots)
	return rects.filter((r) => r.width >= 5 && r.height >= 5);
}

// / Pre-multiply new transform matrix onto current CTM (PDF.js convention)
function applyTransform(current: number[], m: number[]): number[] {
	const [a, b, c, d, e, f] = m;
	return [
		a * current[0] + b * current[2],
		a * current[1] + b * current[3],
		c * current[0] + d * current[2],
		c * current[1] + d * current[3],
		e * current[0] + f * current[2] + current[4],
		e * current[1] + f * current[3] + current[5],
	];
}

// / Transform a path rectangle through the CTM and flip Y to match the text coordinate system
function transformRect(
	x: number,
	y: number,
	w: number,
	h: number,
	ctm: number[],
	viewportHeight: number
): { x: number; y: number; width: number; height: number } | null {
	const [a, b, c, d, e, f] = ctm;
	// Transform all 4 corners through the affine transform
	const corners = [
		[x, y],
		[x + w, y],
		[x + w, y + h],
		[x, y + h],
	].map(([px, py]) => ({
		tx: a * px + c * py + e,
		ty: b * px + d * py + f,
	}));

	const txs = corners.map((p) => p.tx);
	const tys = corners.map((p) => p.ty);
	const left = Math.min(...txs);
	const right = Math.max(...txs);
	const bottom = Math.min(...tys);
	const top = Math.max(...tys);

	const width = right - left;
	const height = top - bottom;
	if (width < 0.5 || height < 0.5) return null;

	// Flip Y: PDF origin is bottom-left; our text system has Y=0 at top
	const flippedY = viewportHeight - top;
	return { x: left, y: flippedY, width, height };
}

// / Push transformed rectangles into the output array for a paint operation
function commitRects(
	pending: Array<{ x: number; y: number; w: number; h: number }>,
	ctmStack: number[][],
	viewportHeight: number,
	page: number,
	fill: RGBColor | null,
	stroke: RGBColor | null,
	out: PdfRect[]
): void {
	const ctm = ctmStack[ctmStack.length - 1];
	for (const pr of pending) {
		const transformed = transformRect(pr.x, pr.y, pr.w, pr.h, ctm, viewportHeight);
		if (transformed) {
			out.push({ ...transformed, page, fillColor: fill, strokeColor: stroke });
		}
	}
}

// / Convert CMYK (0–1 each) to approximate RGB
function cmykToRgb(c: number, m: number, y: number, k: number): RGBColor {
	return {
		r: (1 - c) * (1 - k),
		g: (1 - m) * (1 - k),
		b: (1 - y) * (1 - k),
	};
}

// / Check whether two colors are perceptually similar within a tolerance
export function colorsMatch(a: RGBColor, b: RGBColor, tolerance = 0.08): boolean {
	return (
		Math.abs(a.r - b.r) < tolerance &&
		Math.abs(a.g - b.g) < tolerance &&
		Math.abs(a.b - b.b) < tolerance
	);
}

// / True if the color is white or near-white (typical page background)
export function isNearWhite(color: RGBColor, threshold = 0.93): boolean {
	return color.r >= threshold && color.g >= threshold && color.b >= threshold;
}

// / True if the color is black or very dark (typical border/line color)
export function isNearBlack(color: RGBColor, threshold = 0.15): boolean {
	return color.r <= threshold && color.g <= threshold && color.b <= threshold;
}
