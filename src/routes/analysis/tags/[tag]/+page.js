import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const data = await client.fetch(
		`*[_type == "article" && tags == "${params.tag}"]{_id, title, content, slug}`
	);

	if (data) {
		return {
			articles: data
		};
	}

	throw error(404, 'Not found');
}
