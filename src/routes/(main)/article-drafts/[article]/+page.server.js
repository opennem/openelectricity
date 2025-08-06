import { error } from '@sveltejs/kit';
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
export async function load({ params }) {
	const data = await client.fetch(
		`*[_type == "article" && slug.current == "${params.article}"]
			{_id, title, tldr, content, cover, summary, publish_date, author[]->}`
	);

	if (data && data.length > 0) {
		return {
			title: data[0].title,
			tldr: data[0].tldr,
			content: data[0].content,
			author: data[0].author,
			cover: data[0].cover,
			summary: data[0].summary,
			publishDate: data[0].publish_date
		};
	}

	error(404, 'Not found');
}
