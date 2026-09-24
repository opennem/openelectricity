import { comparisonMetric, comparisonMetricValue, comparisonUnit } from './comparison-metrics.js';
import { COMPARISON_REGIONS, comparisonPeriod } from './region-comparison.js';
import { datasetToCsv, datasetToSheet, summaryToSheet, trackerFileName } from './tracker-export.js';
import { regionLabel } from '$lib/regions.js';

/** @typedef {import('./region-comparison.js').RegionComparisonSelection} RegionComparisonSelection */
/** The region comparison's dataset, plus the CPI reference its real prices used.
 * @typedef {import('./types.js').ExportDataset & { cpiReference: string | null }} RegionComparisonDataset */

/** Calendar labels are synthetic UTC instants, so the serialisers get UTC. */
const CALENDAR_ZONE = '+00:00';

/** @param {Record<string,any[]>} data @param {RegionComparisonSelection} state @param {{start:number,end:number}} viewport @param {string | null} [cpiReference]
 * @returns {RegionComparisonDataset} */
export function comparisonExportDataset(data, state, viewport, cpiReference = null) {
	const metrics = state.charts.map(comparisonMetric);
	const rows = state.regions.flatMap((id) =>
		(data[id] ?? [])
			.filter((row) => row.time >= viewport.start && row.time < viewport.end)
			.map((row) => ({
				period: comparisonPeriod(row.time, state.interval),
				region: regionLabel(id, COMPARISON_REGIONS),
				...Object.fromEntries(
					metrics.map((metric) => [metric.id, comparisonMetricValue(row, metric.id, state.basis)])
				)
			}))
	);
	return {
		key: 'regions',
		title: 'Region comparison',
		columns: [
			{ key: 'period', header: 'Period', type: 'string' },
			{ key: 'region', header: 'Region', type: 'string' },
			...metrics.map((metric) => ({
				key: metric.id,
				header:
					metric.id === 'share'
						? `Renewables / ${state.basis === 'demand' ? 'gross demand' : 'source generation'} (%)`
						: `${metric.label} (${comparisonUnit(metric.id, state.basis, true).replace('CO₂', 'CO2')}${metric.id === 'price_real' && cpiReference ? `; ${cpiReference} dollars` : ''})`,
				type: /** @type {const} */ ('number')
			}))
		],
		rows,
		cpiReference
	};
}

/** @param {RegionComparisonDataset} dataset */
export const regionComparisonCsv = (dataset) => datasetToCsv(dataset, CALENDAR_ZONE);

/** `tracker-regions-<interval>-<first period>-to-<last period>.<ext>`.
 * @param {RegionComparisonSelection} state @param {{start:number,end:number}} viewport
 * @param {'csv' | 'xlsx'} extension */
export function comparisonFileName(state, viewport, extension) {
	const length = state.interval === '1d' ? 10 : 7;
	const period = (/** @type {number} */ ms) => new Date(ms).toISOString().slice(0, length);
	return trackerFileName({
		scope: 'regions',
		dataset: state.interval,
		range: `${period(viewport.start)}-to-${period(viewport.end - 1)}`,
		extension
	});
}

/** @param {RegionComparisonDataset} dataset @param {string} url @param {RegionComparisonSelection} state */
export function comparisonWorkbook(dataset, url, state) {
	return [
		summaryToSheet([
			['View', 'Compare'],
			[
				'Charts',
				state.charts
					.map(comparisonMetric)
					.map((metric) => metric.label)
					.join(', ')
			],
			['CPI reference', dataset.cpiReference ?? 'Unavailable'],
			['Source URL', url],
			['Periods', 'Complete local calendar periods; NEM and WEM aligned by calendar label'],
			['Percentage basis', state.basis === 'demand' ? 'Gross demand' : 'Source generation'],
			['Regions', state.regions.map((id) => regionLabel(id, COMPARISON_REGIONS)).join(', ')],
			['Method', 'Ratios of component sums; All Regions = NEM + WEM; missing values are blank']
		]),
		datasetToSheet(dataset, CALENDAR_ZONE)
	];
}
