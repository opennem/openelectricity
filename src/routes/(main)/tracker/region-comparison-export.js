import { comparisonMetric, comparisonMetricValue, comparisonUnit } from './comparison-metrics.js';
import { COMPARISON_REGIONS, comparisonPeriod } from './region-comparison.js';
import { datasetToCsv, datasetToSheet, summaryToSheet } from './tracker-export.js';

/** @param {Record<string,any[]>} data @param {import('./region-comparison.js').RegionComparisonSelection} state @param {{start:number,end:number}} viewport @param {string | null} [cpiReference] */
export function comparisonExportDataset(data, state, viewport, cpiReference = null) {
	const metrics = state.charts.map(comparisonMetric);
	const rows = state.regions.flatMap((id) =>
		(data[id] ?? [])
			.filter((row) => row.time >= viewport.start && row.time < viewport.end)
			.map((row) => ({
				period: comparisonPeriod(row.time, state.interval),
				region: COMPARISON_REGIONS.find((region) => region.value === id)?.label ?? id,
				...Object.fromEntries(
					metrics.map((metric) => [metric.id, comparisonMetricValue(row, metric.id, state.basis)])
				)
			}))
	);
	return {
		key: /** @type {const} */ ('table'),
		title: 'Region comparison',
		columns: [
			{ key: 'period', header: 'Period', type: /** @type {const} */ ('string') },
			{ key: 'region', header: 'Region', type: /** @type {const} */ ('string') },
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
/** @param {ReturnType<typeof comparisonExportDataset>} dataset */
export const comparisonCsv = (dataset) => datasetToCsv(dataset, '+00:00');
/** @param {ReturnType<typeof comparisonExportDataset>} dataset @param {string} url @param {import('./region-comparison.js').RegionComparisonSelection} state */
export function comparisonWorkbook(dataset, url, state) {
	return [
		summaryToSheet([
			['View', 'Compare regions'],
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
			[
				'Regions',
				state.regions
					.map((id) => COMPARISON_REGIONS.find((r) => r.value === id)?.label ?? id)
					.join(', ')
			],
			['Method', 'Ratios of component sums; All Regions = NEM + WEM; missing values are blank']
		]),
		datasetToSheet(dataset, '+00:00')
	];
}
