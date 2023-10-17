import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/kit/vite';
import { client } from '$lib/sanity';

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
