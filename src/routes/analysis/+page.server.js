import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	const data = await client.fetch(
		`*[_type == "article"] | order(publish_date desc){_id, title, content, slug, publish_date, cover, article_type, region, fueltech, summary, author[]->, tags[]->}`
	);

	if (data) {
		return {
			articles: data.filter((d) => d.article_type !== null)
		};
	}

	error(404, 'Not found');
}
