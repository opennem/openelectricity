import { error } from '@sveltejs/kit';
import { client } from '$lib/sanity';
import { createCmsClient } from '$lib/sanity-cms.js';
import { normaliseChart } from '$lib/stratify/chart-data.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const data = await client.fetch(
		`*[_type == "article" && slug.current == "${params.article}"]
			{_id, title, tldr, content, cover, summary, publish_date, author[]->}`
	);

	if (!data || data.length === 0) {
		error(404, 'Not found');
	}

	const article = data[0];
	const charts = await preloadStratifyCharts(article.content);

	return {
		title: article.title,
		tldr: article.tldr,
		content: article.content,
		author: article.author,
		cover: article.cover,
		summary: article.summary,
		publishDate: article.publish_date,
		charts
	};
}

/**
 * Scan content blocks for strataEmbed types and batch-fetch chart data from Sanity.
 * @param {any[] | null} content
 * @returns {Promise<Record<string, any>>}
 */
async function preloadStratifyCharts(content) {
	if (!content) return {};

	const chartIds = [
		...new Set(
			content
				.filter((/** @type {any} */ block) => block._type === 'strataEmbed' && block.chartId)
				.map((/** @type {any} */ block) => block.chartId)
		)
	];

	if (chartIds.length === 0) return {};

	const cmsClient = createCmsClient();
	const charts = await cmsClient.fetch(
		`*[_type == "stratifyChart" && _id in $ids && status == "published"]`,
		{ ids: chartIds }
	);

	/** @type {Record<string, any>} */
	const chartMap = {};
	for (const chart of charts) {
		chartMap[chart._id] = normaliseChart(chart);
	}

	return chartMap;
}
