import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/kit/vite';

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
		}
	},
	preprocess: vitePreprocess()
};

export default config;
