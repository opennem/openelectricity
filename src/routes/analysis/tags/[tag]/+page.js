import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const data = await client.fetch(
		`*[_type == "article" && count((tags[]->slug.current)[@ in ["${params.tag}"]]) > 0] { title, slug }`
	);

	if (data) {
		return {
			articles: data
		};
	}

	throw error(404, 'Not found');
}
