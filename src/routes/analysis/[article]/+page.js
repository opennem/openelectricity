import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const data = await client.fetch(
		`*[_type == "article" && slug.current == "${params.article}"]
			{_id, title, content}`
	);

	if (data && data.length > 0) {
		return {
			title: data[0].title,
			content: data[0].content
		};
	}

	throw error(404, 'Not found');
}
