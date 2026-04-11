// @ Schedule Scanner — PDF only
// # Purpose: Scan PDF program timetables for the admin uploader
// # Excel parsers have been archived in src/lib/utils/archive/

import {
    parseScheduleBlocks,
    buildScheduleSummary,
    type ParsedCourse,
    type ScheduleSummary,
} from './scheduleParser';

export interface ScheduleScanResult {
    courses: ParsedCourse[];
    summary: ScheduleSummary;
    processedFile: {
        name: string;
        sheetName: string;
        extractedRows: number;
        detectedBlocks: number;
    };
}

export async function scanSchedule(file: File): Promise<ScheduleScanResult> {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
        throw new Error('Only PDF files are supported in the admin uploader');
    }

    const { parsePdfTimetable } = await import('./pdfGridParser');
    const pdfResult = await parsePdfTimetable(file);
    const summary = buildScheduleSummary(pdfResult.courses);

    return {
        courses: pdfResult.courses,
        summary,
        processedFile: {
            name: file.name,
            sheetName: 'PDF Timetable',
            extractedRows: pdfResult.metadata.pageCount,
            detectedBlocks: pdfResult.metadata.sectionsFound,
        },
    };
}
