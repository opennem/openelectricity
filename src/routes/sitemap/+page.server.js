import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';

/** @type {import('./$types').PageLoad} */
export async function load() {
	const articles = await client.fetch(`*[_type == "article"]{_id, title, slug}`);
	const tags = await client.fetch(`*[_type == "tag"]{_id, title, slug}`);
	// const facilities = await client.fetch(`*[_type == "facility"]{_id, name, code}`);
	const contentPages = await client.fetch(`*[_type == "content"]{_id, title, slug}`);

	if (articles && tags) {
		return {
			articles,
			tags,
			facilities: [],
			contentPages
		};
	}

	error(404, 'Not found');
}
