// @ File reader utility for extracting text from different file types
// # Purpose: Normalize text extraction across PDF, CSV, and Excel formats
import * as XLSX from 'xlsx';

// / Define extracted document structure
export interface ExtractedDocument {
	rawText: string;
	lines: string[];
	fileType: 'pdf' | 'csv' | 'excel';
	metadata: {
		fileName: string;
		fileSize: number;
		extractedAt: Date;
	};
}

// / Define line with formatting info
export interface TextLine {
	text: string;
	lineNumber: number;
	isBold?: boolean;
	isHeading?: boolean;
	isTableRow?: boolean;
	indentLevel?: number;
}

// / Read PDF file and extract text
// @ Note: Requires pdfjs-dist library
export async function readPDF(file: File): Promise<ExtractedDocument> {
	// # For now, return placeholder
	// TODO: Implement PDF text extraction with pdfjs-dist
	const text = await file.text();

	return {
		rawText: text,
		lines: text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0),
		fileType: 'pdf',
		metadata: {
			fileName: file.name,
			fileSize: file.size,
			extractedAt: new Date(),
		},
	};
}

// / Read CSV file and extract text
export async function readCSV(file: File): Promise<ExtractedDocument> {
	const csv = await file.text();

	// # Parse CSV into rows
	const rows = csv.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);

	// @ Format CSV rows as readable text
	const formattedLines = rows.map((row) => {
		// / Split by comma and rejoin with clarity
		return row.split(',').map((cell) => cell.trim()).join(' | ');
	});

	return {
		rawText: csv,
		lines: formattedLines,
		fileType: 'csv',
		metadata: {
			fileName: file.name,
			fileSize: file.size,
			extractedAt: new Date(),
		},
	};
}

// / Read Excel file and extract text
// @ Note: Requires xlsx library
export async function readExcel(file: File): Promise<ExtractedDocument> {
	try {
		// # Read file as ArrayBuffer
		const buffer = await file.arrayBuffer();
		
		// @ Parse workbook
		const workbook = XLSX.read(buffer, { type: 'array' });
		
		// # Get first sheet
		const sheetName = workbook.SheetNames[0];
		if (!sheetName) {
			throw new Error('No sheets found in Excel file');
		}
		
		const sheet = workbook.Sheets[sheetName];
		
		// @ Convert sheet to CSV format (which we can then split into lines)
		const csvText = XLSX.utils.sheet_to_csv(sheet);
		
		// # Split into lines and clean
		const lines = csvText
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
		
		return {
			rawText: csvText,
			lines,
			fileType: 'excel',
			metadata: {
				fileName: file.name,
				fileSize: file.size,
				extractedAt: new Date(),
			},
		};
	} catch (error) {
		// # Fallback to plain text reading if xlsx parsing fails
		const text = await file.text();
		return {
			rawText: text,
			lines: text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0),
			fileType: 'excel',
			metadata: {
				fileName: file.name,
				fileSize: file.size,
				extractedAt: new Date(),
			},
		};
	}
}

// / Main function to read any supported file type
export async function readDocumentFile(file: File): Promise<ExtractedDocument> {
	const fileName = file.name.toLowerCase();

	// # Determine file type and call appropriate reader
	if (fileName.endsWith('.pdf')) {
		return readPDF(file);
	} else if (fileName.endsWith('.csv')) {
		return readCSV(file);
	} else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
		return readExcel(file);
	} else {
		throw new Error(`Unsupported file type: ${file.type}`);
	}
}

// / Clean and normalize text for analysis
export function normalizeText(text: string): string {
	return (
		text
			// @ Remove extra whitespace
			.replace(/\s+/g, ' ')
			// / Remove special characters but keep dates
			.replace(/[^\w\s\d\/\-.,:\(\)]/g, ' ')
			.trim()
	);
}

// / Detect if a line appears to be a heading or emphasis
export function detectLineEmphasis(line: string): { isHeading: boolean; isBold: boolean } {
	return {
		isHeading: line.length < 100 && (line.endsWith(':') || /^#+/.test(line)),
		isBold: line.length < 150 && line.toUpperCase() === line,
	};
}
