import { derived, writable } from 'svelte/store';
import { startOfYear } from 'date-fns';

import Statistic from '$lib/utils/Statistic';
import TimeSeries from '$lib/utils/TimeSeries';
import parseInterval from '$lib/utils/intervals';
import { fuelTechNameReducer, loadFuelTechs } from '$lib/fuel_techs.js';
import { colourReducer } from '$lib/stores/theme';
import { pathwayOrder } from './scenarios';
import { explorerGroups, groupMap, orderMap } from './explorer-ft-groups';

export function modelStore() {
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

	const dataViewOptions = [
		{
			value: 'energy',
			label: 'Energy (TWh)',
			description: 'Energy Generation (TWh) by Financial Year'
		},
		{
			value: 'capacity',
			label: 'Capacity (TW)',
			description: 'Capacity (TW) by Financial Year'
		}
	];

	/** @type {Object.<string, Date[]>} */
	const xTicks = {
		aemo2024: [
			startOfYear(new Date('2011-01-01')),
			startOfYear(new Date('2025-01-01')),
			startOfYear(new Date('2038-01-01')),
			startOfYear(new Date('2052-01-01'))
		],
		aemo2022: [
			startOfYear(new Date('2011-01-01')),
			startOfYear(new Date('2024-01-01')),
			startOfYear(new Date('2037-01-01')),
			startOfYear(new Date('2051-01-01'))
		]
	};

	const regionOptions = [
		{
			value: 'NEM',
			label: 'National Electricity Market',
			description: 'National Electricity Market'
		},
		{
			value: 'NSW1',
			label: 'New South Wales',
			description: 'New South Wales'
		},
		{
			value: 'QLD1',
			label: 'Queensland',
			description: 'Queensland'
		},
		{
			value: 'SA1',
			label: 'South Australia',
			description: 'South Australia'
		},
		{
			value: 'TAS1',
			label: 'Tasmania',
			description: 'Tasmania'
		},
		{
			value: 'VIC1',
			label: 'Victoria',
			description: 'Victoria'
		}
	];

	const selectedModel = writable(modelOptions[0].value);
	const selectedDataView = writable(dataViewOptions[0].value);
	const selectedRegion = writable(regionOptions[0].value);
	const modelXTicks = derived(selectedModel, ($selectedModel) => {
		return xTicks[$selectedModel];
	});

	const selectedDataDescription = derived(selectedDataView, ($selectedDataView) => {
		const find = dataViewOptions.find((d) => d.value === $selectedDataView);
		return find ? find.description : '';
	});

	const selectedDataLabel = derived(selectedDataView, ($selectedDataView) => {
		const find = dataViewOptions.find((d) => d.value === $selectedDataView);
		return find ? find.label : '';
	});

	return {
		modelOptions: modelOptions,
		selectedModel: selectedModel,
		modelXTicks: modelXTicks,

		regionOptions: regionOptions,
		selectedRegion: selectedRegion,

		dataViewOptions: dataViewOptions,
		selectedDataView: selectedDataView,
		selectedDataDescription: selectedDataDescription,
		selectedDataLabel: selectedDataLabel
	};
}

export function projectionStore() {
	const historicalData = writable([]);
	const projectionData = writable({ scenarios: [], pathways: [], outlook: { data: [] } });

	const selectedScenario = writable('');
	const selectedPathway = writable('');
	const selectedFuelTechGrouping = writable(explorerGroups[0].value);

	const seriesItems = writable([]);

	const scenarioOptions = derived(projectionData, ($projectionData) => {
		return $projectionData.scenarios.map((scenario) => {
			return {
				value: scenario,
				label: scenario.split('_').join(' ')
			};
		});
	});
	const pathwayOptions = derived(projectionData, ($projectionData) => {
		let pathways = [];
		pathwayOrder.forEach((pathway) => {
			const find = $projectionData.pathways.find((p) => p === pathway);
			if (find) {
				pathways.push(find);
			}
		});

		return pathways.map((pathway) => {
			return {
				value: pathway,
				label: pathway.split('_').join(' ')
			};
		});
	});

	const filteredModelData = derived(
		[projectionData, selectedScenario, selectedPathway],
		([$projectionData, $selectedScenario, $selectedPathway]) => {
			return $projectionData.outlook.data.filter(
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
	const historicalStatsData = derived(
		[historicalData, group, order],
		([$historicalData, $group, $order]) => {
			return new Statistic($historicalData, 'history')
				.invertLoadValues(loadFuelTechs)
				.group($group, loadFuelTechs)
				.reorder($order);
		}
	);

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

	// update selected values based on model changes
	scenarioOptions.subscribe((scenarios) => {
		if (scenarios.length === 0) return;
		selectedScenario.set(scenarios[0].value);
	});
	// pathwayOptions.subscribe((pathways) => {
	// 	if (pathways.length === 0) return;
	// 	selectedPathway.set(pathways[0].value);
	// });

	return {
		historicalData: historicalData,
		projectionData: projectionData,

		selectedScenario: selectedScenario,
		selectedPathway: selectedPathway,
		selectedFuelTechGrouping: selectedFuelTechGrouping,

		scenarioOptions: scenarioOptions,
		pathwayOptions: pathwayOptions,
		fuelTechGroupingOptions: explorerGroups,

		filteredModelData: filteredModelData,
		statsData: statsData,
		timeSeriesData: timeSeriesData,

		historicalStatsData: historicalStatsData,
		historicalTimeSeriesData: historicalTimeSeriesData,

		yDomain: yDomain,

		seriesItems: seriesItems
	};
}
