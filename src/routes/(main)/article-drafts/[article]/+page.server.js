import { error } from '@sveltejs/kit';
import { createClient } from '@sanity/client';
import { PUBLIC_SANITY_DATASET, PUBLIC_SANITY_PROJECT_ID } from '$env/static/public';
import { SANITY_TOKEN } from '$env/static/private';

const client = createClient({
	projectId: PUBLIC_SANITY_PROJECT_ID,
	dataset: PUBLIC_SANITY_DATASET,
	apiVersion: '2025-04-30',
	useCdn: false,
	perspective: 'drafts',
	token: SANITY_TOKEN
});

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
 * Scan content blocks for strataEmbed types and batch-fetch chart data.
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

	const charts = await client.fetch(
		`*[_type == "stratifyChart" && _id in $ids && status == "published"]`,
		{ ids: chartIds }
	);

	/** @type {Record<string, any>} */
	const chartMap = {};
	for (const chart of charts) {
		chartMap[chart._id] = {
			_id: chart._id,
			title: chart.title ?? '',
			description: chart.description ?? '',
			dataSource: chart.dataSource ?? '',
			notes: chart.notes ?? '',
			csvText: chart.csvText ?? '',
			chartType: chart.chartType ?? 'stacked-area',
			displayMode: chart.displayMode ?? 'auto',
			hiddenSeries: chart.hiddenSeries ?? [],
			userSeriesColours: safeParseJSON(chart.userSeriesColours, {}),
			userSeriesLabels: safeParseJSON(chart.userSeriesLabels, {}),
			annotations: safeParseJSON(chart.annotations, []),
			seriesChartTypes: safeParseJSON(chart.seriesChartTypes, {}),
			plotOverrides: safeParseJSON(chart.plotOverrides, null),
			seriesOrder: chart.seriesOrder ?? [],
			stylePreset: chart.stylePreset ?? 'oe',
			showBranding: chart.showBranding ?? true,
			chartHeight: chart.chartHeight ?? 400,
			xTicks: chart.xTicks ?? 0,
			xTickRotate: chart.xTickRotate ?? 0,
			marginBottom: chart.marginBottom ?? 0,
			colourSeries: chart.colourSeries ?? null,
			xLabel: chart.xLabel ?? '',
			yLabel: chart.yLabel ?? ''
		};
	}

	return chartMap;
}

/**
 * @param {any} value
 * @param {any} fallback
 */
function safeParseJSON(value, fallback) {
	if (typeof value !== 'string') return value ?? fallback;
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
}
