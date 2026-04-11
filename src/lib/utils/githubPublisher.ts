// @ GitHub Publisher
// # Purpose: Commit course JSON to a GitHub repo via the Contents API

import type { ParsedCourse } from './scheduleParser';

interface SemesterPeriod {
    id: string;
    label: string;
    description: string;
    category: string;
    startDate: string;
    endDate: string;
    startDate2?: string;
    endDate2?: string;
    tentative?: boolean;
}

// / Shape of one semester's entry in courses.json
interface SemesterData {
    id: string;
    label: string;
    description: string;
    category: string;
    dateRanges: { start: string; end: string; label: string }[];
    lastUpdated: string;
    courses: ParsedCourse[];
}

// / Shape of the full courses.json file
interface CoursesFile {
    version: number;
    lastUpdated: string;
    semesters: Record<string, SemesterData>;
}

export interface PublishOptions {
    pat: string;
    owner: string;
    repo: string;
    semester: SemesterPeriod;
    courses: ParsedCourse[];
}

export interface MultiPublishOptions {
    pat: string;
    owner: string;
    repo: string;
    updates: { semester: SemesterPeriod; courses: ParsedCourse[] }[];
}

const FILE_PATH = 'static/data/courses.json';

// / Fetch the current courses.json from a repo (returns null if file doesn't exist yet)
async function getCurrentFile(owner: string, repo: string, pat: string): Promise<{ content: CoursesFile; sha: string } | null> {
    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${FILE_PATH}`,
        {
            headers: {
                'Authorization': `Bearer ${pat}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        }
    );

    if (response.status === 404) return null;
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`GitHub API error ${response.status}: ${(err as any).message || response.statusText}`);
    }

    const data = await response.json();
    const decoded = atob(data.content.replace(/\n/g, ''));
    const content = JSON.parse(decoded) as CoursesFile;
    return { content, sha: data.sha };
}

// / Commit the updated courses.json to the repo
async function commitFile(
    owner: string,
    repo: string,
    pat: string,
    content: CoursesFile,
    sha: string | undefined,
    message: string
): Promise<void> {
    const json = JSON.stringify(content, null, 2);
    // btoa with UTF-8 safe encoding
    const encoded = btoa(unescape(encodeURIComponent(json)));

    const body: Record<string, unknown> = {
        message,
        content: encoded,
    };
    if (sha) body.sha = sha;

    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${FILE_PATH}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${pat}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        }
    );

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(`Failed to commit to ${repo}: ${(err as any).message || response.statusText}`);
    }
}

// / Publish multiple semesters in a single commit
export async function publishMultipleSemesters(options: MultiPublishOptions): Promise<void> {
    const { pat, owner, repo, updates } = options;

    const existing = await getCurrentFile(owner, repo, pat);
    const currentFile: CoursesFile = existing?.content ?? { version: 1, lastUpdated: '', semesters: {} };

    for (const { semester, courses } of updates) {
        const dateRanges: { start: string; end: string; label: string }[] = [
            { start: semester.startDate, end: semester.endDate, label: semester.label },
        ];
        if (semester.startDate2 && semester.endDate2) {
            dateRanges.push({ start: semester.startDate2, end: semester.endDate2, label: semester.label });
        }

        currentFile.semesters[semester.id] = {
            id: semester.id,
            label: semester.label,
            description: semester.description,
            category: semester.category,
            dateRanges,
            lastUpdated: new Date().toISOString(),
            courses,
        };
    }

    currentFile.lastUpdated = new Date().toISOString();

    const labels = updates.map(u => u.semester.label).join(', ');
    const totalCourses = updates.reduce((n, u) => n + u.courses.length, 0);
    await commitFile(owner, repo, pat, currentFile, existing?.sha,
        `Update ${labels} course data (${totalCourses} courses)`);
}

// / Main publish function — updates one semester's data in courses.json
export async function publishCourses(options: PublishOptions): Promise<void> {
    const { pat, owner, repo, semester, courses } = options;

    // 1. Get current file (to preserve other semesters)
    const existing = await getCurrentFile(owner, repo, pat);

    const currentFile: CoursesFile = existing?.content ?? {
        version: 1,
        lastUpdated: '',
        semesters: {},
    };

    // 2. Build date ranges for this semester
    const dateRanges: { start: string; end: string; label: string }[] = [
        { start: semester.startDate, end: semester.endDate, label: semester.label },
    ];
    if (semester.startDate2 && semester.endDate2) {
        dateRanges.push({ start: semester.startDate2, end: semester.endDate2, label: semester.label });
    }

    // 3. Replace only this semester's data
    const semesterData: SemesterData = {
        id: semester.id,
        label: semester.label,
        description: semester.description,
        category: semester.category,
        dateRanges,
        lastUpdated: new Date().toISOString(),
        courses,
    };

    currentFile.semesters[semester.id] = semesterData;
    currentFile.lastUpdated = new Date().toISOString();

    // 4. Commit
    await commitFile(
        owner,
        repo,
        pat,
        currentFile,
        existing?.sha,
        `Update ${semester.label} course data (${courses.length} courses)`
    );
}
