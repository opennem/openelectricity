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
					'<files>',
					'/analysis/*',
					'/facility/*',
					'/content/*',
					'/isp/*',
					'/records'
				]
			}
		}),
		prerender: {
			handleHttpError: 'warn'
		},
		version: {
			name: pkg.version
		}
	},
	vitePlugin: {
		inspector: true
	},
	preprocess: vitePreprocess()
};

export default config;
