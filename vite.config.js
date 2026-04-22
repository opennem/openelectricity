import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Clerk (~1.5 MB) and MapLibre (~1.0 MB) are lazy-loaded on auth/map routes only.
		// Bumped above their size so the warning still fires for accidental regressions.
		chunkSizeWarningLimit: 1600
	},
	test: {
		exclude: ['**/node_modules/**', 'tests/e2e/**']
	}
});
