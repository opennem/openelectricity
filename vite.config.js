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
		exclude: ['**/node_modules/**', 'tests/e2e/**']
	}
});
