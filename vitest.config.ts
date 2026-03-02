import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
	test: {
		// Run in Node — all tested utilities are DOM-free.
		// pdfGridParser / pdfVisualBlockExtractor require a real browser
		// and are not collected here.
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
	resolve: {
		alias: {
			// Mirror the $lib alias from svelte.config.js so imports work
			$lib: resolve(__dirname, './src/lib'),
		},
	},
});
