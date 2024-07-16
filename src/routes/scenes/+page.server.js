import { client } from '$lib/sanity';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
	// TODO: fetch only 4 latest artciles with ISP tag rather than fetching from all articles
	/** @type {Article[]} */
	const articles = await client.fetch(
		`*[_type == "article"]| order(publish_date desc)[0..10]{_id, title, content, slug, publish_date, cover, article_type, region, fueltech, summary, author[]->, tags[]->}`
	);

	return {
		articles: articles.filter((d) => d.article_type !== null)
	};
}
