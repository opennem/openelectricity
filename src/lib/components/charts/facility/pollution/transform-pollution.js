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

import { CATEGORY_META, getCategoryPalette } from './pollution-constants.js';

/**
 * @typedef {Object} PollutantSeries
 * @property {string} code
 * @property {string} label
 * @property {string} unit
 * @property {string} category
 * @property {Record<string, number | null>} values - year → value
 */

/**
 * @typedef {Object} CategoryChartData
 * @property {Array<Record<string, any>>} data - Rows for ChartStore: [{ category: '2015', time: 0, pollCode: val, ... }]
 * @property {string[]} seriesNames
 * @property {Record<string, string>} seriesColours
 * @property {Record<string, string>} seriesLabels
 * @property {string} unit
 */

/**
 * @typedef {Object} PollutionData
 * @property {string[]} years - Sorted year strings
 * @property {PollutantSeries[]} pollutants - All pollutant series with data
 * @property {Record<string, PollutantSeries[]>} byCategory - Pollutants grouped by category
 * @property {Record<string, CategoryChartData>} chartDataByCategory - ChartStore-ready grouped-bar data per category
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

	// Group by category, ordered by CATEGORY_META keys
	/** @type {Record<string, PollutantSeries[]>} */
	const byCategory = {};
	for (const p of pollutants) {
		if (!byCategory[p.category]) byCategory[p.category] = [];
		byCategory[p.category].push(p);
	}

	// Build ChartStore-ready data per category
	/** @type {Record<string, CategoryChartData>} */
	const chartDataByCategory = {};

	for (const [catKey, catPollutants] of Object.entries(byCategory)) {
		const seriesNames = catPollutants.map((p) => p.code);
		const palette = getCategoryPalette(catKey, seriesNames.length);

		/** @type {Record<string, string>} */
		const seriesColours = {};
		/** @type {Record<string, string>} */
		const seriesLabels = {};

		seriesNames.forEach((name, i) => {
			seriesColours[name] = palette[i];
			seriesLabels[name] = catPollutants[i].label;
		});

		const data = years.map((year, i) => {
			/** @type {Record<string, any>} */
			const row = { category: year, time: i, date: new Date(Number(year), 0, 1) };
			for (const p of catPollutants) {
				row[p.code] = p.values[year] ?? 0;
			}
			return row;
		});

		chartDataByCategory[catKey] = {
			data,
			seriesNames,
			seriesColours,
			seriesLabels,
			unit: catPollutants[0]?.unit || ''
		};
	}

	return { years, pollutants, byCategory, chartDataByCategory };
}
