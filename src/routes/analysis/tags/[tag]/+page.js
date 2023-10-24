import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';

/** @type {import('./$types').PageLoad} */
export async function load({ params }) {
	const data = await client.fetch(
		`*[_type == "tag" && slug.current == "${params.tag}"]{
			title, 
			"articles": *[_type=='article' && count((tags[]->slug.current)[@ == "${params.tag}"]) > 0]{ title, slug }
		}`
	);

	if (data && data.length) {
		return {
			...data[0]
		};
	}

	throw error(404, 'Not found');
}
