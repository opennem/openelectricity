import { derived, writable } from 'svelte/store';
import { startOfYear } from 'date-fns';

import Statistic from '$lib/utils/Statistic';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';
import { fuelTechNameReducer, loadFuelTechs } from '$lib/fuel_techs.js';
import { colourReducer } from '$lib/stores/theme';
import { explorerGroups, groupMap, orderMap } from '../explorer-ft-groups';

/**
 *
 * @param {*} projectionData
 * @param {*} historicalData
 */
export function projectionStore(projectionData, historicalData) {
	if (!projectionData || !historicalData) {
		throw new Error('projectionStore: projectionData and historicalData are required');
	}

	console.log('historicalData', historicalData);

	const modelOptions = [
		{
			value: 'aemo2024',
			label: 'AEMO Draft 2024 ISP',
			description: "AEMO's Draft 2024 Integrated System Plan"
		},
		{
			value: 'aemo2022',
			label: 'AEMO 2022 ISP',
			description: "AEMO's 2022 Integrated System Plan"
		}
	];
	const xTicks = {
		aemo2024: [
			startOfYear(new Date('2025-01-01')),
			startOfYear(new Date('2038-01-01')),
			startOfYear(new Date('2052-01-01'))
		],
		aemo2022: [
			startOfYear(new Date('2024-01-01')),
			startOfYear(new Date('2037-01-01')),
			startOfYear(new Date('2051-01-01'))
		]
	};

	const selectedModel = writable(modelOptions[0].value);
	const selectedScenario = writable('');
	const selectedPathway = writable('');
	const selectedFuelTechGrouping = writable(explorerGroups[0].value);

	const scenarioOptions = derived(selectedModel, ($selectedModel) => {
		return projectionData[$selectedModel].scenarios.map((scenario) => {
			return {
				value: scenario,
				label: scenario.split('_').join(' ')
			};
		});
	});
	const pathwayOptions = derived(selectedModel, ($selectedModel) => {
		return projectionData[$selectedModel].pathways.map((pathway) => {
			return {
				value: pathway,
				label: pathway.split('_').join(' ')
			};
		});
	});

	const filteredModelData = derived(
		[selectedModel, selectedScenario, selectedPathway],
		([$selectedModel, $selectedScenario, $selectedPathway]) => {
			return projectionData[$selectedModel].outlookEnergyNem.data.filter(
				(d) => d.scenario === $selectedScenario && d.pathway === $selectedPathway
			);
		}
	);

	const group = derived(selectedFuelTechGrouping, ($selectedFuelTechGrouping) => {
		return groupMap[$selectedFuelTechGrouping];
	});
	const order = derived(selectedFuelTechGrouping, ($selectedFuelTechGrouping) => {
		return orderMap[$selectedFuelTechGrouping];
	});

	const statsData = derived(
		[filteredModelData, group, order],
		([$filteredModelData, $group, $order]) => {
			return new Statistic($filteredModelData, 'projection')
				.invertLoadValues(loadFuelTechs)
				.group($group, loadFuelTechs)
				.reorder($order);
		}
	);

	const projectionLoadSeries = derived(statsData, ($statsData) => {
		const filtered = $statsData.data.filter((d) => d.isLoad);
		return filtered.map((d) => d.id);
	});

	const timeSeriesData = derived(
		[statsData, colourReducer, projectionLoadSeries],
		([$statsData, $colourReducer, $projectionLoadSeries]) => {
			return new TimeSeries(
				$statsData.data,
				parseInterval('1Y'),
				'projection',
				fuelTechNameReducer,
				$colourReducer
			)
				.transform()
				.updateMinMax($projectionLoadSeries);
		}
	);

	const yDomain = derived(timeSeriesData, ($timeSeriesData) => {
		return [$timeSeriesData.minY, $timeSeriesData.maxY];
	});

	// Historical data
	const historicalStatsData = derived([group, order], ([$group, $order]) => {
		return new Statistic(historicalData, 'history')
			.invertLoadValues(loadFuelTechs)
			.group($group, loadFuelTechs)
			.reorder($order);
	});

	const historicalLoadSeries = derived(historicalStatsData, ($historicalStatsData) => {
		const filtered = $historicalStatsData.data.filter((d) => d.isLoad);
		return filtered.map((d) => d.id);
	});

	const historicalTimeSeriesData = derived(
		[historicalStatsData, colourReducer, historicalLoadSeries],
		([$historicalStatsData, $colourReducer, $historicalLoadSeries]) => {
			return new TimeSeries(
				$historicalStatsData.data,
				parseInterval('1M'),
				'history',
				fuelTechNameReducer,
				$colourReducer
			)
				.transform()
				.rollup(parseInterval('FY'))
				.updateMinMax($historicalLoadSeries);
		}
	);

	const modelXTicks = derived(selectedModel, ($selectedModel) => {
		return xTicks[$selectedModel];
	});

	// update selected values based on model changes
	scenarioOptions.subscribe((scenarios) => {
		selectedScenario.set(scenarios[0].value);
	});
	pathwayOptions.subscribe((pathways) => {
		selectedPathway.set(pathways[0].value);
	});

	return {
		selectedModel: selectedModel,
		selectedScenario: selectedScenario,
		selectedPathway: selectedPathway,
		selectedFuelTechGrouping: selectedFuelTechGrouping,

		modelOptions: modelOptions,
		scenarioOptions: scenarioOptions,
		pathwayOptions: pathwayOptions,
		fuelTechGroupingOptions: explorerGroups,

		filteredModelData: filteredModelData,
		statsData: statsData,
		timeSeriesData: timeSeriesData,

		historicalStatsData: historicalStatsData,
		historicalTimeSeriesData: historicalTimeSeriesData,

		modelXTicks: modelXTicks,
		yDomain: yDomain
	};
}
