/**
 * Transform raw OE API pollution response into chart-ready data structures.
 *
 * API shape per series (INetworkTimeSeries):
 *   { unit: "kg", results: [{ name: "BAYSW", columns: { pollutant_code, pollutant_label, pollutant_category, ... }, data: [[timestamp, value], ...] }] }
 *
 * Each series has one result, one pollutant. The pollutant metadata lives in `columns`.
 *
 * @module transform-pollution
 */

import { getCategoryPalette } from './pollution-constants.js';

/**
 * @typedef {Object} PollutantSeries
 * @property {string} code
 * @property {string} label
 * @property {string} unit
 * @property {string} category
 * @property {Record<string, number | null>} values - year → value
 */

/**
 * @typedef {Object} CategoryMeta
 * @property {string[]} seriesNames - Ordered pollutant codes
 * @property {Record<string, string>} seriesColours - code → palette colour
 * @property {Record<string, string>} seriesLabels - code → display label
 * @property {string} unit - Common unit across the category (NPI reports kg)
 */

/**
 * @typedef {Object} PollutionData
 * @property {string[]} years - Sorted year strings
 * @property {PollutantSeries[]} pollutants - All pollutant series with data
 * @property {Record<string, PollutantSeries[]>} byCategory - Pollutants grouped by category
 */

/**
 * Extract year string from a timestamp.
 * API uses financial year timestamps (e.g. "2001-07-01T00:00:00" = FY 2001-02).
 * We use the calendar year of the timestamp as the label.
 * @param {string} timestamp
 * @returns {string}
 */
function extractYear(timestamp) {
	return timestamp.slice(0, 4);
}

/**
 * Transform raw API pollution data into structured PollutionData.
 *
 * @param {any[]} apiData - Array of INetworkTimeSeries from the pollution endpoint
 * @returns {PollutionData}
 */
export function transformPollutionData(apiData) {
	/** @type {Set<string>} */
	const yearSet = new Set();

	/** @type {Map<string, PollutantSeries>} */
	const seriesMap = new Map();

	for (const ts of apiData) {
		const unit = ts.unit || '';

		for (const result of ts.results) {
			const columns = result.columns || {};
			const code = columns.pollutant_code || result.name;
			const label = columns.pollutant_label || columns.pollutant_name || code;
			const category = columns.pollutant_category || 'air_pollutant';

			if (!seriesMap.has(code)) {
				seriesMap.set(code, { code, label, unit, category, values: {} });
			}

			const series = /** @type {PollutantSeries} */ (seriesMap.get(code));

			for (const [timestamp, value] of result.data) {
				const year = extractYear(timestamp);
				yearSet.add(year);
				series.values[year] = value;
			}
		}
	}

	const years = [...yearSet].sort();
	const pollutants = [...seriesMap.values()];

	// Group by category, preserving insertion order of pollutants within
	// each group.
	/** @type {Record<string, PollutantSeries[]>} */
	const byCategory = {};
	for (const p of pollutants) {
		if (!byCategory[p.category]) byCategory[p.category] = [];
		byCategory[p.category].push(p);
	}

	return { years, pollutants, byCategory };
}

/**
 * Compute the per-category meta (series names, colour palette, labels, unit)
 * used by both the public small-multiples panel and the studio bar charts.
 * Row shapes differ between consumers — they build the actual `data` array
 * themselves — but the series identity and palette are shared.
 *
 * @param {string} catKey
 * @param {PollutantSeries[]} pollutants
 * @returns {CategoryMeta}
 */
export function buildCategoryMeta(catKey, pollutants) {
	const seriesNames = pollutants.map((p) => p.code);
	const palette = getCategoryPalette(catKey, seriesNames.length);
	/** @type {Record<string, string>} */
	const seriesColours = {};
	/** @type {Record<string, string>} */
	const seriesLabels = {};
	seriesNames.forEach((name, i) => {
		seriesColours[name] = palette[i];
		seriesLabels[name] = pollutants[i].label;
	});
	return {
		seriesNames,
		seriesColours,
		seriesLabels,
		unit: pollutants[0]?.unit ?? ''
	};
}
