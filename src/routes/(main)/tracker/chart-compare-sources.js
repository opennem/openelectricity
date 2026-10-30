/**
 * Compare sources — what each Tracker chart card hands its compare panel
 * (`CompareSource`): Timeline's cards build on the shared snapshot sources
 * (`$lib/components/charts/card/compare/snapshot-sources.js`); Compare's
 * cards read the regions' rows. Pure module: the canvases pass in what the
 * card is showing.
 */

import { networkTimeZoneLabel } from '$lib/components/charts/v2/network-time.js';
import {
	deriveVwPriceDisplayRows,
	VW_PRICE_SERIES_ID
} from '$lib/components/charts/network/process-price-vw.js';
import {
	deriveIntensityDisplayRows,
	INTENSITY_SERIES_ID
} from '$lib/components/charts/network/process-emissions-intensity.js';
import {
	formatRankChange,
	formatSignedChange
} from '$lib/components/charts/card/compare/chart-compare.js';
import {
	componentSums,
	largestVisible,
	lineCompareSource,
	stackCompareSource
} from '$lib/components/charts/card/compare/snapshot-sources.js';
import {
	formatDollarsCompact,
	formatFixed,
	tonnesPrefix
} from '$lib/components/charts/card/cell-format.js';
import {
	formatTableEmissions,
	formatTableEnergy,
	formatTableIntensity,
	formatTablePower
} from './table-format.js';
import { formatPercentageValue } from '$lib/components/charts/card/cell-format.js';
import { comparisonMetric, comparisonUnit, formatComparisonCell } from './comparison-metrics.js';
import { benchmarkRankRows, rankComparisonRows } from './comparison-displays.js';
import { COMPARISON_REGIONS, comparisonChartRows, comparisonPeriod } from './region-comparison.js';
import { comparisonValueUnit } from './region-comparison-export.js';

/** @typedef {import('./types.js').CompareSource} CompareSource */
/** @typedef {import('./types.js').GenerationSnapshot} GenerationSnapshot */
/** @typedef {import('./types.js').TimelineCard} TimelineCard */

const ABSOLUTE_NOTE =
	'Values are absolute; the chart’s proportion, change and growth views do not apply.';

/**
 * A Timeline card's comparison: Generation, market value and emissions
 * volume are stacks (a composition of the visible technologies); spot price,
 * volume-weighted price and intensity are one line, VW price and intensity
 * derived from their components exactly as the chart draws them, and
 * referenced to the ratio of their window sums. Values are absolute base
 * units whatever the chart's proportion or change-since view.
 *
 * @param {TimelineCard} card
 * @param {GenerationSnapshot | null} snapshot
 * @param {{
 *   metric: string,
 *   hidden: string[],
 *   loadIds: string[],
 *   prefix: SiPrefix,
 *   held: Record<number, Record<string, any>>,
 *   region: string,
 *   zone: string,
 *   interval: string,
 *   formatTime: (time: number) => string,
 *   formatExportTime?: (time: number) => string
 * }} context - `held`: rows drawn at A or B before a pan (`compare-pins`)
 * @returns {CompareSource | null}
 */
export function timelineCompareSource(card, snapshot, context) {
	if (!snapshot) return null;
	const { metric, hidden, loadIds, prefix, held, region, zone, interval } = context;
	const shared = {
		held,
		formatTime: context.formatTime,
		formatExportTime: context.formatExportTime,
		context: [
			{ key: 'region', header: 'Region', value: region },
			{ key: 'timeZone', header: 'Network time', value: networkTimeZoneLabel(zone) },
			{ key: 'interval', header: 'Interval', value: interval }
		]
	};

	if (metric === 'price_vw' || metric === 'emissions_intensity') {
		const intensity = metric === 'emissions_intensity';
		/** The line, derived from its components as the chart does. @param {Record<string, any>} row */
		const derive = (row) =>
			intensity
				? deriveIntensityDisplayRows([/** @type {any} */ (row)])[0][INTENSITY_SERIES_ID]
				: deriveVwPriceDisplayRows([/** @type {any} */ (row)])[0][VW_PRICE_SERIES_ID];
		const keys = intensity ? ['emissions', 'energy_mwh'] : ['market_value', 'energy_mwh'];
		const unit = intensity ? 'kgCO₂e/MWh' : '$/MWh';
		const title = intensity ? 'Emissions intensity' : 'Volume-weighted price';
		return lineCompareSource(snapshot, {
			...shared,
			title: `${title} comparison`,
			label: title,
			series: ['value'],
			read: (row) => derive(row),
			reference: (rows) => derive(componentSums(rows, keys)),
			referenceLabel: 'Window',
			unit,
			baseUnit: unit.replace('CO₂', 'CO2'),
			format: intensity
				? (value) => formatTableIntensity(value, 'k')
				: (value) => formatFixed(value),
			note: ABSOLUTE_NOTE
		});
	}
	if (card === 'market' && metric === 'price') {
		return lineCompareSource(snapshot, {
			...shared,
			title: 'Spot price comparison',
			label: 'Spot price',
			series: snapshot.seriesNames.slice(0, 1),
			unit: '$/MWh',
			baseUnit: '$/MWh',
			format: (value) => formatFixed(value),
			note: ABSOLUTE_NOTE
		});
	}

	// Stacks: the visible series, top of the stack first.
	const stack = { ...shared, hidden, loadIds };
	if (card === 'generation') {
		const energy = metric === 'energy';
		return stackCompareSource(snapshot, {
			...stack,
			title: 'Generation comparison',
			unit: `${prefix}${energy ? 'Wh' : 'W'}`,
			baseUnit: energy ? 'MWh' : 'MW',
			format: (value) =>
				energy ? formatTableEnergy(value, prefix) : formatTablePower(value, prefix),
			note: `Values are absolute ${energy ? 'energy' : 'power'}; the chart’s proportion, change and growth views do not apply.`
		});
	}
	if (card === 'market') {
		return stackCompareSource(snapshot, {
			...stack,
			title: 'Market value comparison',
			unit: '$',
			baseUnit: '$',
			format: formatDollarsCompact,
			note: ABSOLUTE_NOTE
		});
	}
	const tonnes = tonnesPrefix(largestVisible(snapshot, hidden));
	return stackCompareSource(snapshot, {
		...stack,
		title: 'Emissions comparison',
		unit: `${tonnes}tCO₂e`,
		baseUnit: 'tCO2e',
		format: (value) => formatTableEmissions(value, tonnes)
	});
}

/**
 * A ranked place as the Ranks tooltip reads it: `#2`, or for a reference
 * between ranks `#2–3`, `above #1`, `below #4`.
 * @param {number | null} place @param {number} last - The lowest rank
 */
export function formatRankPlace(place, last) {
	if (place === null || !Number.isFinite(place)) return '—';
	if (Number.isInteger(place)) return `#${place}`;
	if (place < 1) return 'above #1';
	if (place > last) return `below #${last}`;
	return `#${Math.floor(place)}–${Math.ceil(place)}`;
}

/**
 * A Compare card's comparison: one series per selected region, the card's
 * metric at each period, or under Ranks each state's rank with NEM and All
 * Regions placed among them as dashed references. Shares change in
 * percentage points; the heatmap's colour scale shades each value's chip.
 * Only periods where a region has a value can be picked.
 *
 * @param {{
 *   data: Record<string, any[]>,
 *   regions: string[],
 *   benchmarks?: string[],
 *   metric: string,
 *   basis: 'demand' | 'generation',
 *   interval: string,
 *   months: number,
 *   rank?: boolean,
 *   colourOf?: ((value: number | null) => string) | null,
 *   cpiReference?: string | null
 * }} input
 * @returns {CompareSource}
 */
export function regionCompareSource({
	data,
	regions,
	benchmarks = [],
	metric,
	basis,
	interval,
	months,
	rank = false,
	colourOf = null,
	cpiReference = null
}) {
	const definition = comparisonMetric(metric);
	const values = comparisonChartRows(
		data,
		rank ? [...regions, ...benchmarks] : regions,
		metric,
		basis,
		months
	);
	const rows = rank ? rankComparisonRows(values, regions) : values;
	const places = rank && benchmarks.length ? benchmarkRankRows(values, regions, benchmarks) : [];
	const rowByTime = new Map(rows.map((row) => [row.time, row]));
	const placeByTime = new Map(places.map((row) => [row.time, row]));
	const shown = rank ? [...regions, ...benchmarks] : regions;
	const share = definition.kind === 'share';
	const unit = rank ? 'rank' : comparisonUnit(metric, basis);
	/** @param {number | null} value */
	const format = rank
		? (/** @type {number | null} */ value) => formatRankPlace(value, regions.length)
		: (/** @type {number | null} */ value) => formatComparisonCell(value, metric, {});
	return {
		kind: 'lines',
		title: `${definition.label}${rank ? ' rank' : ''} comparison`,
		rowHeader: 'Region',
		times: rows
			.filter((row) => regions.some((id) => Number.isFinite(row[id])))
			.map((row) => row.time),
		series: shown.map((id) => {
			const region = COMPARISON_REGIONS.find((entry) => entry.value === id);
			return {
				id,
				label: region?.label ?? id,
				colour: region?.colour ?? '#777777',
				dashed: benchmarks.includes(id) && rank
			};
		}),
		value: (time, id) => {
			const value = (benchmarks.includes(id) && rank ? placeByTime : rowByTime).get(time)?.[id];
			return Number.isFinite(value) ? value : null;
		},
		deltaMode: rank ? 'rank' : share ? 'points' : 'relative',
		unit,
		baseUnit: rank ? 'rank' : comparisonValueUnit(metric, basis, cpiReference),
		format,
		formatDelta: rank
			? formatRankChange
			: share
				? (value) => formatSignedChange(value, formatPercentageValue)
				: (value) => formatSignedChange(value, (number) => format(number)),
		formatTime: (time) => comparisonPeriod(time, interval),
		colourOf: colourOf ?? undefined,
		context: [
			{ key: 'metric', header: 'Metric', value: definition.label },
			{ key: 'interval', header: 'Interval', value: interval }
		],
		note:
			definition.kind === 'energy' || definition.kind === 'emissions'
				? `Values in ${unit}.`
				: undefined
	};
}
