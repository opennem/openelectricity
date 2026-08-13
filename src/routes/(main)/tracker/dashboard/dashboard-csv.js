import { escapeCsv } from '$lib/utils/download-csv.js';
import { formatNetworkTimestamp } from '$lib/components/charts/facility/facility-csv.js';

/** @param {string} type @param {string} metric */
function unitFor(type, metric) {
	if (type === 'price') return '$/MWh';
	if (metric === 'emissions_intensity') return 'kgCO2e/MWh';
	if (type === 'emissions') return 'tCO2e';
	return metric === 'energy' || metric.endsWith('_energy') ? 'MWh' : 'MW';
}

/**
 * @param {{ key: string, title: string, type: string, metric: string, data: any[], seriesNames: string[], seriesLabels?: Record<string,string> }[]} datasets
 * @param {string} timeZone
 */
export function buildLongDashboardCsv(datasets, timeZone) {
	const lines = [['panel', 'date', 'series', 'value', 'unit'].map(escapeCsv).join(',')];
	for (const dataset of datasets) {
		const unit = unitFor(dataset.type, dataset.metric);
		for (const row of dataset.data ?? []) {
			const time = row.time ?? row.date?.getTime?.();
			if (!Number.isFinite(time)) continue;
			for (const series of dataset.seriesNames ?? []) {
				const value = row[series];
				if (!Number.isFinite(value)) continue;
				lines.push(
					[
						dataset.title,
						formatNetworkTimestamp(time, timeZone),
						dataset.seriesLabels?.[series] ?? series,
						value,
						unit
					]
						.map(escapeCsv)
						.join(',')
				);
			}
		}
	}
	return lines.length > 1 ? lines.join('\n') : null;
}

/** @param {{ data: any[], seriesNames: string[], seriesLabels?: Record<string,string>, type: string, metric: string }} dataset @param {string} timeZone */
export function buildWidePanelCsv(dataset, timeZone) {
	if (!dataset?.data?.length || !dataset?.seriesNames?.length) return null;
	const unit = unitFor(dataset.type, dataset.metric);
	const header = [
		'date',
		...dataset.seriesNames.map((series) => `${dataset.seriesLabels?.[series] ?? series} (${unit})`)
	];
	const lines = [header.map(escapeCsv).join(',')];
	for (const row of dataset.data) {
		const time = row.time ?? row.date?.getTime?.();
		if (!Number.isFinite(time)) continue;
		lines.push(
			[
				formatNetworkTimestamp(time, timeZone),
				...dataset.seriesNames.map((series) =>
					Number.isFinite(row[series]) ? String(row[series]) : ''
				)
			]
				.map(escapeCsv)
				.join(',')
		);
	}
	return lines.length > 1 ? lines.join('\n') : null;
}

/** @param {string} value */
export function csvFilenameSlug(value) {
	return (
		value
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/(^-|-$)/g, '') || 'dashboard'
	);
}
