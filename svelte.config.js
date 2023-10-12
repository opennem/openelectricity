import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/kit/vite';
import { createClient } from '@sanity/client';

const client = createClient({
	projectId: 'bjedimft',
	dataset: 'production',
	apiVersion: '2023-10-11',
	useCdn: false
});

const getEntries = async () => {
	const data = await client.fetch(`*[_type == "facility"]`);
	return data.map((record) => `/facility/${record.code}`);
};

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
			entries: await getEntries()
		}
	},
	preprocess: vitePreprocess()
};

export default config;
