import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const data = await client.fetch(
		`*[_type == "article" && slug.current == "${params.article}"]
			{_id, title, content, author->{name, position, image}}`
	);

	if (data && data.length > 0) {
		return {
			title: data[0].title,
			content: data[0].content,
			author: data[0].author
		};
	}

	throw error(404, 'Not found');
}
