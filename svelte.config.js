import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const file = fileURLToPath(new URL('package.json', import.meta.url));
const json = readFileSync(file, 'utf8');
const pkg = JSON.parse(json);

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// See https://kit.svelte.dev/docs/adapter-cloudflare for more information about Cloudflare adapters.
		adapter: adapter({
			routes: {
				include: ['/*'],
				exclude: [
					'<build>',
					'/data/*',
					'/fonts/*',
					'/img/*',
					'/og/*',
					'/map-styles/*',
					'/favicon.png',
					'/robots.txt',
					'/studio/lens-on-emissions/data/*',
					'/analysis/*',
					'/content/*',
					'/isp/*'
				]
			}
		}),
		prerender: {
			handleHttpError: 'warn',
			// Absolute URLs emitted during prerender (e.g. /sitemap-articles.xml)
			// resolve against the production domain instead of the default
			// http://sveltekit-prerender placeholder.
			origin: 'https://openelectricity.org.au'
		},
		version: {
			name: pkg.version,
			pollInterval: 5 * 60 * 1000
		}
	},
	vitePlugin: {
		inspector: true
	},
	preprocess: vitePreprocess()
};

export default config;
