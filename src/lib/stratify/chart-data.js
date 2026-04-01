/**
 * Shared utilities for Stratify chart data normalisation.
 *
 * Used by server-side load functions to normalise raw Sanity chart
 * documents into a consistent shape with defaults applied.
 */

import { migrateChartType } from '$lib/stratify/chart-types.js';

/**
 * Safely parse a JSON string, returning a fallback on failure.
 * @param {any} value
 * @param {any} fallback
 */
export function safeParseJSON(value, fallback) {
	if (typeof value !== 'string') return value ?? fallback;
	try {
		return JSON.parse(value);
	} catch {
		return fallback;
	}
}

/**
 * Normalise a raw Sanity stratifyChart document into a consistent shape
 * with defaults applied and JSON fields parsed.
 * @param {Record<string, any>} chart - Raw Sanity document
 * @returns {Record<string, any>}
 */
export function normaliseChart(chart) {
	return {
		_id: chart._id,
		title: chart.title ?? '',
		description: chart.description ?? '',
		dataSource: chart.dataSource ?? '',
		notes: chart.notes ?? '',
		csvText: chart.csvText ?? '',
		chartType: migrateChartType(chart.chartType ?? 'line'),
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
		yTicks: chart.yTicks ?? 0,
		yMinMax: chart.yMinMax ?? false,
		y2Ticks: chart.y2Ticks ?? 0,
		y2MinMax: chart.y2MinMax ?? false,
		tooltipColumns: chart.tooltipColumns ?? [],
		xColumn: chart.xColumn ?? '',
		categorySort: chart.categorySort ?? 'default',
		showXTickLabels: chart.showXTickLabels ?? true,
		colourSeries: chart.colourSeries ?? null,
		xLabel: chart.xLabel ?? '',
		yLabel: chart.yLabel ?? '',
		seriesYAxis: safeParseJSON(chart.seriesYAxis, {}),
		y2Label: chart.y2Label ?? ''
	};
}
