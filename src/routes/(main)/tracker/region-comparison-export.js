/**
 * Compare's downloads: each chart card as its display draws it, the Regions
 * table as shown, the workbook Summary and file names. Pure module.
 */
import { comparisonMetric, comparisonMetricValue, comparisonUnit } from './comparison-metrics.js';
import {
	COMPARISON_REGIONS,
	comparisonChartRows,
	comparisonDisplay,
	comparisonMonthSlug,
	comparisonPeriod
} from './region-comparison.js';
import {
	benchmarkComparisonRegions,
	benchmarkRankRows,
	isRankableComparisonMetric,
	rankComparisonRows,
	rankedComparisonRegions
} from './comparison-displays.js';
import { trackerFileName } from './tracker-export.js';
import { regionLabel } from '$lib/regions.js';

/** @typedef {import('./region-comparison.js').RegionComparisonSelection} RegionComparisonSelection */
/** @typedef {import('./types.js').ExportColumn} ExportColumn */
/** @typedef {import('./types.js').ExportDataset} ExportDataset */

/** @param {string} id */
const labelOf = (id) => regionLabel(id, COMPARISON_REGIONS);
const PERIOD_COLUMN = /** @type {ExportColumn} */ ({
	key: 'period',
	header: 'Period',
	type: 'string'
});

/**
 * A metric's unit in base units, as a header writes it: `MWh`, `tCO2e`,
 * `% gross demand`, `$/MWh; 2026 dollars` for real prices.
 * @param {string} metric @param {'demand' | 'generation'} basis @param {string | null} cpiReference */
export function comparisonValueUnit(metric, basis, cpiReference) {
	if (metric === 'renewables_share')
		return `% ${basis === 'demand' ? 'gross demand' : 'source generation'}`;
	const unit = comparisonUnit(metric, basis, true).replace('CO₂', 'CO2');
	return metric === 'price_real' && cpiReference ? `${unit}; ${cpiReference} dollars` : unit;
}

/**
 * One Compare card's download, as its display draws it, over the periods in
 * the viewport where a selected region has a value:
 * - Trends, Panels and Heatmap: each selected region's value
 * - Ranks, for a rankable metric: each state's (and WEM's) rank, where NEM
 *   and All Regions are placed among them, then the values ranked
 * - Ranks, for a volume: values, as the card draws them
 * Null when nothing is drawn (no values, or nothing to rank).
 * @param {{
 *   data: Record<string, any[]>,
 *   regions: string[],
 *   metric: string,
 *   basis: 'demand' | 'generation',
 *   interval: string,
 *   months: number,
 *   viewport: {start: number, end: number},
 *   display: string,
 *   cpiReference?: string | null
 * }} input
 * @returns {ExportDataset | null}
 */
export function comparisonChartDataset({
	data,
	regions,
	metric,
	basis,
	interval,
	months,
	viewport,
	display,
	cpiReference = null
}) {
	const unit = comparisonValueUnit(metric, basis, cpiReference);
	const rows = comparisonChartRows(data, regions, metric, basis, months).filter(
		(row) =>
			row.time >= viewport.start &&
			row.time < viewport.end &&
			regions.some((id) => Number.isFinite(row[id]))
	);
	const ranked = display === 'ranks' && isRankableComparisonMetric(metric);
	const rankedRegions = ranked ? rankedComparisonRegions(regions) : [];
	if (!rows.length || (ranked && !rankedRegions.length)) return null;
	/** @type {ExportColumn[]} */
	const valueColumns = regions.map((id) => ({
		key: `value:${id}`,
		header: `${labelOf(id)} (${unit})`,
		type: 'number'
	}));
	/** @param {any} row */
	const values = (row) => Object.fromEntries(regions.map((id) => [`value:${id}`, row[id]]));
	/** @type {ExportColumn[]} */
	let columns = [PERIOD_COLUMN, ...valueColumns];
	/** @type {Array<Record<string, any>>} */
	let out = rows.map((row) => ({ period: comparisonPeriod(row.time, interval), ...values(row) }));
	if (ranked) {
		const benchmarks = benchmarkComparisonRegions(regions);
		const ranks = rankComparisonRows(rows, rankedRegions);
		const places = benchmarkRankRows(rows, rankedRegions, benchmarks);
		columns = [
			PERIOD_COLUMN,
			...rankedRegions.map((id) => ({
				key: `rank:${id}`,
				header: `${labelOf(id)} rank`,
				type: /** @type {const} */ ('number')
			})),
			...benchmarks.map((id) => ({
				key: `place:${id}`,
				header: `${labelOf(id)} place`,
				type: /** @type {const} */ ('string')
			})),
			...valueColumns
		];
		out = out.map((row, i) => ({
			...row,
			...Object.fromEntries(rankedRegions.map((id) => [`rank:${id}`, ranks[i][id]])),
			...Object.fromEntries(benchmarks.map((id) => [`place:${id}`, places[i].labels[id] ?? null]))
		}));
	}
	return {
		key: `regions-${metric}`,
		title: comparisonMetric(metric).label,
		columns,
		rows: out
	};
}

/**
 * The Regions table as shown: every region in its row order (a Ranks card's
 * ranks while Ranks shows), whether it is compared, and each chart's value
 * at the table's period — hovered, pinned or the latest common one.
 * @param {{
 *   data: Record<string, any[]>,
 *   tableRegions: string[],
 *   selected: string[],
 *   metrics: string[],
 *   basis: 'demand' | 'generation',
 *   period: number | null,
 *   interval: string,
 *   cpiReference?: string | null
 * }} input
 * @returns {ExportDataset | null}
 */
export function comparisonTableDataset({
	data,
	tableRegions,
	selected,
	metrics,
	basis,
	period,
	interval,
	cpiReference = null
}) {
	if (period == null) return null;
	return {
		key: 'regions-table',
		title: 'Regions table',
		columns: [
			PERIOD_COLUMN,
			{ key: 'region', header: 'Region', type: 'string' },
			{ key: 'selected', header: 'Compared', type: 'boolean' },
			...metrics.map((id) => ({
				key: `value:${id}`,
				header: `${comparisonMetric(id).shortLabel} (${comparisonValueUnit(id, basis, cpiReference)})`,
				type: /** @type {const} */ ('number')
			}))
		],
		rows: tableRegions.map((region) => {
			const row = data[region]?.find((candidate) => candidate.time === period);
			return {
				period: comparisonPeriod(period, interval),
				region: labelOf(region),
				selected: selected.includes(region),
				...Object.fromEntries(
					metrics.map((id) => [`value:${id}`, comparisonMetricValue(row, id, basis)])
				)
			};
		})
	};
}

/**
 * Compare's Summary rows; the shell adds the provenance.
 * @param {RegionComparisonSelection} state @param {string | null} cpiReference
 * @returns {Array<[string, string]>} */
export function comparisonSummaryRows(state, cpiReference) {
	return [
		['View', 'Compare'],
		['Display', comparisonDisplay(state.display).label],
		[
			'Charts',
			state.charts
				.map(comparisonMetric)
				.map((metric) => metric.label)
				.join(', ')
		],
		['Regions', state.regions.map(labelOf).join(', ')],
		['Periods', 'Complete local calendar periods; NEM and WEM aligned by calendar label'],
		['Percentage basis', state.basis === 'demand' ? 'Gross demand' : 'Source generation'],
		['CPI reference', cpiReference ?? 'Unavailable'],
		['Method', 'Ratios of component sums; All Regions = NEM + WEM; missing values are blank']
	];
}

/** `tracker-regions[-<download>]-<interval>-<first period>-to-<last period>.<ext>`.
 * @param {RegionComparisonSelection} state @param {{start:number,end:number}} viewport
 * @param {'csv' | 'xlsx'} extension @param {string} [download] - A download's id */
export function comparisonFileName(state, viewport, extension, download = '') {
	return trackerFileName({
		scope: 'regions',
		dataset: [download.replace(/^regions-/, ''), state.interval].filter(Boolean).join('-'),
		range: `${comparisonMonthSlug(viewport.start)}-to-${comparisonMonthSlug(viewport.end - 1)}`,
		extension
	});
}
