import { cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const buildDir = 'build';
const filename = 'gsb-calendarupdates.html';
const src = join(buildDir, filename);

if (!existsSync(src)) {
    console.error(`Error: ${src} not found. Run "npm run build" first.`);
    process.exit(1);
}

cpSync(src, filename);
console.log(`Copied ${src} → ${filename}`);
