import { derived, writable } from 'svelte/store';
import { colourReducer } from '$lib/stores/theme';
import { groups } from '../groups';
import {
	createNewStats,
	createNewProjectionStats,
	createNewTimeSeries,
	calculatePercentageStats,
	calculateProjectionPercentageStats,
	calculatePercentageTimeSeries
} from '../helpers';

export default function (filters) {
	const selectedGroup = writable(filters?.group || groups[0].value);
	const usePercentage = writable(true);

	const projectionData = writable([]);
	const historicalData = writable([]);

	const isNetTotalGroup = derived(selectedGroup, ($selectedGroup) => $selectedGroup === 'totals');

	const projectionModel = derived(projectionData, ($projectionData) => {
		return $projectionData[0]?.model;
	});

	const projectionStats = derived(
		[projectionModel, projectionData, selectedGroup],
		([$projectionModel, $projectionData, $selectedGroup]) => {
			return $projectionModel === 'aemo2022' // because of inconsistent data
				? createNewStats($projectionData, $selectedGroup, 'projection')
				: createNewProjectionStats($projectionData, $selectedGroup, 'projection');
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
			return $scenarioProjectionData.map((d) => {
				let otherStats =
					d.model === 'aemo2022'
						? createNewStats(d.data, $selectedGroup, 'projection')
						: createNewProjectionStats(d.data, $selectedGroup, 'projection');

				// only calculate percentage if not net total group
				if (!$isNetTotalGroup && $usePercentage) {
					otherStats =
						d.model === 'aemo2022'
							? calculatePercentageStats(d, otherStats, 'projection')
							: calculateProjectionPercentageStats(d, otherStats, 'projection');
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
		[scenarioHistoricalStats, colourReducer, isNetTotalGroup, usePercentage],
		([$scenarioHistoricalStats, $colourReducer, $isNetTotalGroup, $usePercentage]) => {
			const loadIds = $scenarioHistoricalStats.data.filter((d) => d.isLoad).map((d) => d.id);
			let otherTimeSeries = createNewTimeSeries(
				$scenarioHistoricalStats.data,
				$colourReducer,
				loadIds,
				'history',
				'1M',
				'FY'
			);

			// only calculate percentage if not net total group

			if (!$isNetTotalGroup && $usePercentage) {
				otherTimeSeries = calculatePercentageTimeSeries(
					$scenarioHistoricalStats.originalData,
					otherTimeSeries,
					$colourReducer,
					'history'
				);
			}

			return otherTimeSeries;
		}
	);
	/*****/

	/** @type {import('svelte/store').Writable<{ region: string, data: Stats }[]>} */
	const regionProjectionData = writable([]);
	const regionProjectionModel = derived(regionProjectionData, ($regionProjectionData) => {
		return $regionProjectionData.length ? $regionProjectionData[0].data[0].model : '';
	});
	const regionProjectionStats = derived(
		[regionProjectionModel, regionProjectionData, selectedGroup, isNetTotalGroup, usePercentage],
		([
			$regionProjectionModel,
			$regionProjectionData,
			$selectedGroup,
			$isNetTotalGroup,
			$usePercentage
		]) => {
			return $regionProjectionData.map((d) => {
				console.log('regionProjectionModel', $regionProjectionModel);

				let otherStats =
					$regionProjectionModel === 'aemo2022'
						? createNewStats(d.data, $selectedGroup, 'projection')
						: createNewProjectionStats(d.data, $selectedGroup, 'projection');

				// only calculate percentage if not net total group
				if (!$isNetTotalGroup && $usePercentage) {
					otherStats =
						$regionProjectionModel === 'aemo2022'
							? calculatePercentageStats(d, otherStats, 'projection')
							: calculateProjectionPercentageStats(d, otherStats, 'projection');
				}

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
					otherTimeSeries = calculatePercentageTimeSeries(
						d.stats.originalData,
						otherTimeSeries,
						$colourReducer,
						'history'
					);
				}

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
		showPercentage: derived(
			[isNetTotalGroup, usePercentage],
			([$isNetTotalGroup, $usePercentage]) => !$isNetTotalGroup && $usePercentage
		),

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
