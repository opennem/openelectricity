import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const data = await client.fetch(
		`*[_type == "content" && slug.current == "${params.slug}"]{_id, title, content}`
	);

	if (data && data.length > 0) {
		return {
			title: data[0].title,
			content: data[0].content
		};
	}

	error(404, 'Not found');
}
