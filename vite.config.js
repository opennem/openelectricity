import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	server: {
		// openelectricity.localhost, not localhost: cookies are port-blind, so
		// every project served on plain localhost shares one cookie jar and the
		// stacked sessions eventually overflow Node's 16 KB header limit (431).
		// A *.localhost name resolves to loopback (RFC 6761) but is its own
		// cookie origin. The port is pinned (7602 in this machine's per-project
		// block) so bookmarks and auth allow-lists never chase an
		// auto-incremented port.
		host: 'openelectricity.localhost',
		port: 7602,
		strictPort: true
	},
	plugins: [sveltekit()],
	build: {
		// Clerk (~1.5 MB) and MapLibre (~1.0 MB) are lazy-loaded on auth/map routes only.
		// Bumped above their size so the warning still fires for accidental regressions.
		chunkSizeWarningLimit: 1600
	},
	test: {
		// The `runes` project compiles rune modules (`*.svelte.js`) for the
		// client, so `$effect` runs and `flushSync` flushes. The node project
		// compiles them for the server, where effects never run and a test of
		// effect-driven state passes vacuously. Every `*.svelte.test.js` suite
		// therefore runs in `runes`; everything else runs in node.
		projects: [
			{
				extends: true,
				test: {
					name: 'node',
					include: ['src/**/*.test.js'],
					exclude: ['**/node_modules/**', 'tests/e2e/**', '**/*.svelte.test.js']
				}
			},
			{
				extends: true,
				resolve: { conditions: ['browser'] },
				test: {
					name: 'runes',
					include: ['src/**/*.svelte.test.js'],
					environment: 'jsdom'
				}
			}
		]
	}
});
