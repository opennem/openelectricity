import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/kit/vite';

import { createClient } from '@sanity/client';

const client = createClient({
	projectId: 'bjedimft',
	dataset: 'production',
	apiVersion: '2023-10-11',
	useCdn: false
});
const data = await client.fetch(`*[_type == "station"]`);
const pages = data.map((record) => `/facility/${record.code}`);

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		// See https://kit.svelte.dev/docs/adapter-cloudflare for more information about Cloudflare adapters.
		adapter: adapter({
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		}),
		prerender: {
			entries: [...pages]
		}
	},
	preprocess: vitePreprocess()
};

export default config;
