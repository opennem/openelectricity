import { derived, writable } from 'svelte/store';
import { colourReducer } from '$lib/stores/theme';
import { groups } from '../groups';
import { createNewStats, createNewTimeSeries } from '../helpers';

export default function () {
	const selectedGroup = writable(groups[0].value);

	const projectionData = writable([]);
	const historicalData = writable([]);

	const projectionStats = derived(
		[projectionData, selectedGroup],
		([$projectionData, $selectedGroup]) => {
			return createNewStats($projectionData, $selectedGroup, 'projection');
		}
	);
	const projectionLoadSeries = derived(projectionStats, ($projectionStats) => {
		const filtered = $projectionStats.data.filter((d) => d.isLoad);
		return filtered.map((d) => d.id);
	});
	const projectionTimeSeries = derived(
		[projectionStats, colourReducer, projectionLoadSeries],
		([$projectionStats, $colourReducer, $projectionLoadSeries]) => {
			return createNewTimeSeries(
				$projectionStats.data,
				$colourReducer,
				$projectionLoadSeries,
				'projection',
				'1Y',
				''
			);
		}
	);

	const historicalStats = derived(
		[historicalData, selectedGroup],
		([$historicalData, $selectedGroup]) => {
			return createNewStats($historicalData, $selectedGroup, 'history');
		}
	);
	const historicalLoadSeries = derived(historicalStats, ($historicalStats) => {
		const filtered = $historicalStats.data.filter((d) => d.isLoad);
		return filtered.map((d) => d.id);
	});
	const historicalTimeSeries = derived(
		[historicalStats, colourReducer, historicalLoadSeries],
		([$historicalStats, $colourReducer, $historicalLoadSeries]) => {
			return createNewTimeSeries(
				$historicalStats.data,
				$colourReducer,
				$historicalLoadSeries,
				'history',
				'1M',
				'FY'
			);
		}
	);

	/** @type {import('svelte/store').Writable<{ region: string, data: Stats }[]>} */
	const regionProjectionData = writable([]);
	const regionProjectionStats = derived(
		[regionProjectionData, selectedGroup],
		([$regionProjectionData, $selectedGroup]) => {
			return $regionProjectionData.map((d) => {
				return {
					region: d.region,
					stats: createNewStats(d.data, $selectedGroup, 'projection')
				};
			});
		}
	);
	const regionProjectionTimeSeries = derived(
		[regionProjectionStats, colourReducer],
		([$regionProjectionStats, $colourReducer]) => {
			return $regionProjectionStats.map((d) => {
				const loads = d.stats.data.filter((d) => d.isLoad).map((d) => d.id);
				return {
					region: d.region,
					series: createNewTimeSeries(d.stats.data, $colourReducer, loads, 'projection', '1Y', '')
				};
			});
		}
	);

	/** @type {import('svelte/store').Writable<{ region: string, data: Stats }[]>} */
	const regionHistoricalData = writable([]);
	const regionHistoricalStats = derived(
		[regionHistoricalData, selectedGroup],
		([$regionHistoricalData, $selectedGroup]) => {
			return $regionHistoricalData.map((d) => {
				return {
					region: d.region,
					stats: createNewStats(d.data, $selectedGroup, 'history')
				};
			});
		}
	);
	const regionHistoricalTimeSeries = derived(
		[regionHistoricalStats, colourReducer],
		([$regionHistoricalStats, $colourReducer]) => {
			return $regionHistoricalStats.map((d) => {
				const loads = d.stats.data.filter((d) => d.isLoad).map((d) => d.id);
				return {
					region: d.region,
					series: createNewTimeSeries(d.stats.data, $colourReducer, loads, 'history', '1M', 'FY')
				};
			});
		}
	);

	return {
		selectedGroup: selectedGroup,

		projectionData: projectionData,
		projectionStats: projectionStats,
		projectionTimeSeries: projectionTimeSeries,

		regionProjectionData: regionProjectionData,
		regionProjectionStats: regionProjectionStats,
		regionProjectionTimeSeries: regionProjectionTimeSeries,

		historicalData: historicalData,
		historicalStats: historicalStats,
		historicalTimeSeries: historicalTimeSeries,

		regionHistoricalData: regionHistoricalData,
		regionHistoricalStats: regionHistoricalStats,
		regionHistoricalTimeSeries: regionHistoricalTimeSeries
	};
}
