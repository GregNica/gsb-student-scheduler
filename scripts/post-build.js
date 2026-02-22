import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const buildDir = 'build';
const filename = 'gsb-calendarupdates.html';
const src = join(buildDir, filename);

if (!existsSync(src)) {
    console.error(`Error: ${src} not found. Run "npm run build" first.`);
    process.exit(1);
}

let html = readFileSync(src, 'utf-8');

// Fix 1: base path for file:// usage — SvelteKit computes base as the directory
// portion of the URL, which breaks when opened directly from disk.
html = html.replace(
    /base:\s*new URL\('\.', location\)\.pathname\.slice\(0, -1\)/,
    "base: ''"
);

// Fix 2: pdfjs worker data: URL — browsers block data: URL workers from file:// pages.
// The built output sets workerSrc = new URL(`data:text/javascript;base64,...`).toString() (or similar).
// We replace it with a blob: URL created at runtime so it works from file://.
html = html.replace(
    /workerSrc=new URL\(`(data:text\/javascript;base64,[^`]+)`[^)]*\)/,
    (_, dataUrl) => {
        const b64 = dataUrl.replace('data:text/javascript;base64,', '');
        return `workerSrc=URL.createObjectURL(new Blob([Uint8Array.from(atob(\`${b64}\`),c=>c.charCodeAt(0))],{type:'text/javascript'}))`;
    }
);

writeFileSync(filename, html, 'utf-8');
console.log(`Written ${filename} (with file:// base + worker blob fixes)`);
