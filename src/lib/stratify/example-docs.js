import { normaliseChart } from './chart-data.js';
import {
	builtInExamples,
	curatedCommunityExamples,
	getChartTypeGuidance,
	getBuiltInExample,
	getCommunityExample
} from './example-catalogue.js';

/** @param {Record<string, any>} chart */
export function summariseChartConfiguration(chart) {
	const guidance = getChartTypeGuidance(chart.chartType);
	const highlights = [
		{
			label: 'Chart type',
			value: guidance?.label ?? chart.chartType,
			explanation: guidance?.description ?? 'Controls how the data is drawn.'
		}
	];

	if (chart.displayMode && chart.displayMode !== 'auto') {
		const displayLabels = /** @type {Record<string, string>} */ ({
			'time-series': 'Date / time',
			category: 'Category',
			linear: 'Linear number'
		});
		highlights.push({
			label: 'X values',
			value: displayLabels[chart.displayMode] ?? chart.displayMode,
			explanation: 'Sets how values in the first column are spaced and formatted.'
		});
	}

	if (chart.lineRangeMinColumn && chart.lineRangeMaxColumn) {
		highlights.push({
			label: 'Range band',
			value: `${chart.lineRangeMinColumn} → ${chart.lineRangeMaxColumn}`,
			explanation: 'Shades the interval between two numeric columns.'
		});
	}
	if (chart.scatterSizeColumn) {
		highlights.push({
			label: 'Bubble size',
			value: chart.scatterSizeColumn,
			explanation: 'Sizes every point from one shared numeric column.'
		});
	}
	if (chart.facetColumn) {
		highlights.push({
			label: 'Small multiples',
			value: chart.facetColumn,
			explanation: 'Splits the chart into one panel per value.'
		});
	}
	if (chart.chartType?.startsWith('waterfall')) {
		highlights.push({
			label: 'Ending total',
			value: chart.waterfallShowTotal ? 'Shown' : 'Hidden',
			explanation: 'Controls whether Stratify appends the accumulated result.'
		});
	}
	if (chart.chartType === 'map') {
		highlights.push({
			label: 'Location',
			value: `${chart.latColumn ?? 'Latitude'} / ${chart.lngColumn ?? 'Longitude'}`,
			explanation: 'Maps each row using geographic coordinates.'
		});
		if (chart.sizeColumn) {
			highlights.push({
				label: 'Marker size',
				value: chart.sizeColumn,
				explanation: 'Scales markers from a numeric column.'
			});
		}
	}
	if (chart.tooltipDateFormat && chart.tooltipDateFormat !== 'date') {
		highlights.push({
			label: 'Tooltip date',
			value: chart.tooltipDateFormat === 'time' ? 'Time' : 'Date + time',
			explanation: 'Uses en-AU formatting for temporal values.'
		});
	}

	return highlights.slice(0, 6);
}

/** @param {import('./example-catalogue.js').StratifyBuiltInExample} example */
export function builtInDocumentationExample(example) {
	return {
		...example,
		chart: normaliseChart({ _id: `example-${example.slug}`, ...example.snapshot }),
		href: `/stratify/docs/examples/${example.slug}`,
		templateHref: `/stratify/new?template=${encodeURIComponent(example.slug)}`
	};
}

/**
 * @param {import('./example-catalogue.js').StratifyCommunityExample} definition
 * @param {Record<string, any>} chart
 */
export function communityDocumentationExample(definition, chart) {
	const normalised = normaliseChart(chart);
	const guidance = getChartTypeGuidance(normalised.chartType);
	return {
		...definition,
		name: normalised.title || guidance?.label || 'Community example',
		bestFor: guidance?.description ?? definition.purpose,
		avoidWhen:
			'A maintained built-in example may be clearer when learning the controls for the first time.',
		highlights: summariseChartConfiguration(normalised),
		chart: normalised,
		href: `/stratify/docs/examples/${definition.slug}`,
		templateHref: `/stratify/new?template=${encodeURIComponent(definition.slug)}`,
		communityHref: `/strata/${definition.chartId}`
	};
}

/** @param {Array<Record<string, any>>} communityCharts */
export function buildDocumentationCatalogue(communityCharts = []) {
	const chartsById = new Map(communityCharts.map((chart) => [chart._id, chart]));
	return [
		...builtInExamples.map(builtInDocumentationExample),
		...curatedCommunityExamples.flatMap((definition) => {
			const chart = chartsById.get(definition.chartId);
			return chart ? [communityDocumentationExample(definition, chart)] : [];
		})
	];
}

/**
 * @param {string} slug
 * @param {Record<string, any> | null} [communityChart]
 */
export function resolveDocumentationExample(slug, communityChart = null) {
	const builtIn = getBuiltInExample(slug);
	if (builtIn) return builtInDocumentationExample(builtIn);
	const community = getCommunityExample(slug);
	if (community && communityChart) {
		return communityDocumentationExample(community, communityChart);
	}
	return null;
}
