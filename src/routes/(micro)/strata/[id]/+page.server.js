import { error } from '@sveltejs/kit';
import { createCmsClient } from '$lib/sanity-cms.js';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const client = createCmsClient();

	const chart = await client.fetch(
		`*[_type == "stratifyChart" && _id == $id && status == "published"][0]`,
		{ id: params.id }
	);

	if (!chart) {
		error(404, 'Chart not found');
	}

	return {
		chart: {
			_id: chart._id,
			title: chart.title ?? '',
			description: chart.description ?? '',
			dataSource: chart.dataSource ?? '',
			notes: chart.notes ?? '',
			csvText: chart.csvText ?? '',
			chartType: chart.chartType ?? 'stacked-area',
			hiddenSeries: chart.hiddenSeries ?? [],
			userSeriesColours: safeParseJSON(chart.userSeriesColours, {}),
			userSeriesLabels: safeParseJSON(chart.userSeriesLabels, {}),
			annotations: safeParseJSON(chart.annotations, []),
			stylePreset: chart.stylePreset ?? 'oe',
			showBranding: chart.showBranding ?? true,
			publishedAt: chart.publishedAt
		}
	};
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
