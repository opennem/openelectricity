import { error } from '@sveltejs/kit';
// import { client } from '$lib/sanity';
import { createClient } from '@sanity/client';
import { PUBLIC_SANITY_DATASET, PUBLIC_SANITY_PROJECT_ID } from '$env/static/public';
import { SANITY_TOKEN } from '$env/static/private';

const client = createClient({
	projectId: PUBLIC_SANITY_PROJECT_ID,
	dataset: PUBLIC_SANITY_DATASET,
	apiVersion: '2025-04-30',
	useCdn: false,
	perspective: 'drafts',
	token: SANITY_TOKEN
});

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	const data = await client.fetch(
		`*[_type == "article"] | order(publish_date desc){_id, title, content, slug, publish_date, cover, article_type, region, fueltech, summary, author[]->, tags[]->}`
	);

	if (data) {
		return {
			articles: data.filter((d) => d.article_type !== null),
			drafts: data
		};
	}

	error(404, 'Not found');
}
