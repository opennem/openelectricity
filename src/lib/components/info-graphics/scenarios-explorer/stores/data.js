import { derived, writable } from 'svelte/store';
import { colourReducer } from '$lib/stores/theme';
import { groups } from '../groups';
import { createNewStats, createNewTimeSeries, calculatePercentageDataset } from '../helpers';

export default function () {
	const selectedGroup = writable(groups[0].value);
	const usePercentage = writable(true);

	const projectionData = writable([]);
	const historicalData = writable([]);

	const isNetTotalGroup = derived(selectedGroup, ($selectedGroup) => $selectedGroup === 'totals');

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

	/*******
	 * By Scenario
	 */

	/** @type {import('svelte/store').Writable<{ id: string, model: string, pathway: string, scenario: string, data: Stats }[]>} */
	const scenarioProjectionData = writable([]);
	const scenarioProjectionStats = derived(
		[scenarioProjectionData, selectedGroup, isNetTotalGroup, usePercentage],
		([$scenarioProjectionData, $selectedGroup, $isNetTotalGroup, $usePercentage]) => {
			console.log('selectedGroup', $selectedGroup);

			return $scenarioProjectionData.map((d) => {
				const otherStats = createNewStats(d.data, $selectedGroup, 'projection');

				// only calculate percentage if not net total group
				if (!$isNetTotalGroup && $usePercentage) {
					const sourceStats = createNewStats(d.data, 'total_sources', 'projection');
					const sourcesData = sourceStats.data.find((d) => d.code === 'total_sources');
					const netData = [...sourcesData.projection.data];

					otherStats.data.forEach((s) => {
						s.units = '%';
						s.projection.data.forEach((d, i) => {
							s.projection.data[i] = (d / netData[i]) * 100;
						});
					});

					console.log('projection otherStats', otherStats);
				}

				return {
					id: d.id,
					model: d.model,
					scenario: d.scenario,
					pathway: d.pathway,
					stats: otherStats
				};
			});
		}
	);
	const scenarioProjectionTimeSeries = derived(
		[scenarioProjectionStats, colourReducer],
		([$scenarioProjectionStats, $colourReducer]) => {
			return $scenarioProjectionStats.map((d) => {
				const loads = d.stats.data.filter((d) => d.isLoad).map((d) => d.id);
				return {
					id: d.id,
					model: d.model,
					scenario: d.scenario,
					pathway: d.pathway,
					series: createNewTimeSeries(d.stats.data, $colourReducer, loads, 'projection', '1Y', '')
				};
			});
		}
	);

	/** @type {import('svelte/store').Writable<Stats[]>} */
	const scenarioHistoricalData = writable([]);
	const scenarioHistoricalStats = derived(
		[scenarioHistoricalData, selectedGroup],
		([$scenarioHistoricalData, $selectedGroup]) => {
			const otherStats = createNewStats($scenarioHistoricalData, $selectedGroup, 'history');

			return otherStats;
		}
	);
	const scenarioHistoricalTimeSeries = derived(
		[
			scenarioHistoricalData,
			scenarioHistoricalStats,
			colourReducer,
			isNetTotalGroup,
			usePercentage
		],
		([
			$scenarioHistoricalData,
			$scenarioHistoricalStats,
			$colourReducer,
			$isNetTotalGroup,
			$usePercentage
		]) => {
			const loadIds = $scenarioHistoricalStats.data.filter((d) => d.isLoad).map((d) => d.id);
			const otherTimeSeries = createNewTimeSeries(
				$scenarioHistoricalStats.data,
				$colourReducer,
				loadIds,
				'history',
				'1M',
				'FY'
			);

			// only calculate percentage if not net total group
			if (!$isNetTotalGroup && $usePercentage) {
				const sourceStats = createNewStats($scenarioHistoricalData, 'total_sources', 'history');
				const sourceTimeSeries = createNewTimeSeries(
					sourceStats.data,
					$colourReducer,
					loadIds,
					'history',
					'1M',
					'FY'
				);

				// calculate percentage
				const totalSourcesGroupId = sourceTimeSeries.seriesNames[0];
				const sourceTimeSeriesData = sourceTimeSeries.data;

				otherTimeSeries.data.forEach((s, i) => {
					otherTimeSeries.seriesNames.forEach((name) => {
						s[name] = (s[name] / sourceTimeSeriesData[i][totalSourcesGroupId]) * 100;
					});
				});

				console.log('historical otherTimeSeries', otherTimeSeries);
			}

			return otherTimeSeries;
		}
	);
	/*****/

	/** @type {import('svelte/store').Writable<{ region: string, data: Stats }[]>} */
	const regionProjectionData = writable([]);
	const regionProjectionStats = derived(
		[regionProjectionData, selectedGroup, isNetTotalGroup, usePercentage],
		([$regionProjectionData, $selectedGroup, $isNetTotalGroup, $usePercentage]) => {
			return $regionProjectionData.map((d) => {
				const otherStats = createNewStats(d.data, $selectedGroup, 'projection');

				// only calculate percentage if not net total group
				if (!$isNetTotalGroup && $usePercentage) {
					const sourceStats = createNewStats(d.data, 'total_sources', 'projection');
					const sourcesData = sourceStats.data.find((d) => d.code === 'total_sources');
					const netData = [...sourcesData.projection.data];

					otherStats.data.forEach((s) => {
						s.units = '%';
						s.projection.data.forEach((d, i) => {
							s.projection.data[i] = (d / netData[i]) * 100;
						});
					});
				}
				console.log('regionProjectionStats otherStats', otherStats);

				return {
					region: d.region,
					stats: otherStats
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
		[regionHistoricalStats, colourReducer, isNetTotalGroup, usePercentage],
		([$regionHistoricalStats, $colourReducer, $isNetTotalGroup, $usePercentage]) => {
			return $regionHistoricalStats.map((d) => {
				const loadIds = d.stats.data.filter((s) => s.isLoad).map((s) => s.id);

				let otherTimeSeries = createNewTimeSeries(
					d.stats.data,
					$colourReducer,
					loadIds,
					'history',
					'1M',
					'FY'
				);

				// only calculate percentage if not net total group
				if (!$isNetTotalGroup && $usePercentage) {
					otherTimeSeries = calculatePercentageDataset(
						d,
						otherTimeSeries,
						$colourReducer,
						'history'
					);
				}

				console.log('regionHistoricalTimeSeries otherTimeSeries', d.region, otherTimeSeries);

				return {
					region: d.region,
					series: otherTimeSeries
				};
			});
		}
	);

	return {
		selectedGroup: selectedGroup,
		usePercentage: usePercentage,
		isNetTotalGroup: isNetTotalGroup,

		projectionData: projectionData,
		projectionStats: projectionStats,
		projectionTimeSeries: projectionTimeSeries,

		scenarioProjectionData: scenarioProjectionData,
		scenarioProjectionStats: scenarioProjectionStats,
		scenarioProjectionTimeSeries: scenarioProjectionTimeSeries,

		regionProjectionData: regionProjectionData,
		regionProjectionStats: regionProjectionStats,
		regionProjectionTimeSeries: regionProjectionTimeSeries,

		historicalData: historicalData,
		historicalStats: historicalStats,
		historicalTimeSeries: historicalTimeSeries,

		scenarioHistoricalData: scenarioHistoricalData,
		scenarioHistoricalStats: scenarioHistoricalStats,
		scenarioHistoricalTimeSeries: scenarioHistoricalTimeSeries,

		regionHistoricalData: regionHistoricalData,
		regionHistoricalStats: regionHistoricalStats,
		regionHistoricalTimeSeries: regionHistoricalTimeSeries
	};
}
