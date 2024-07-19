import { getScenarioJson, getScenarios } from '$lib/scenarios';
import { getHistory } from '$lib/opennem';

import { covertHistoryDataToTWh, mergeHistoricalEmissionsData } from './utils';

/**
 * Fetch data for Technology view Energy data
 * @param {{ model: string, region: string, scenario: string, pathway: string, dataType: ScenarioDataType }} param0
 */
async function fetchEmissionsData({ model, region, scenario, pathway, dataType }) {
	console.log('fetchTechnologyViewEnergyData', { model, region, scenario, pathway, dataType });

	/** @type {StatsData[][]} */
	const [historyEmisssionsData, historyEnergyData, scenarioData] = await Promise.all([
		getHistory(region, 'emissions'),
		getHistory(region, 'energy'),
		getScenarios(model, scenario)
	]);

	console.log('historyEmisssionsData, historyEnergyData', historyEmisssionsData, historyEnergyData);
	console.log('scenarioData', scenarioData);

	const projection = scenarioData
		.filter((d) => filterScenarioData({ d, pathway, region, dataType }))
		.map((d) =>
			remappedProjectionData({
				d,
				model,
				fuel_tech: 'fossil_fuels'
			})
		);

	// let energyHistoryData = [];

	// if (dataType === 'emissions') {
	// 	const mergedEmissionsData = mergeHistoricalEmissionsData(historyData);
	// 	// also fetch energy data to calculate emissions intensity
	// 	energyHistoryData = await getHistory(region, 'energy');
	// 	// emissions / energy delivered (generation + storage_discharging - storage_charging)
	// 	console.log('energyHistoryData', energyHistoryData);
	// 	console.log('mergedEmissionsData', mergedEmissionsData);
	// }

	const history = mergeHistoricalEmissionsData(historyEmisssionsData);

	return {
		projection,
		history
	};
}

/**
 * Fetch FuelTech data
 * @param {{ model: string, region: string, scenario: string, pathway: string, dataType: ScenarioDataType }} param0
 */
async function fetchFuelTechData({ model, region, scenario, pathway, dataType }) {
	/** @type {StatsData[][]} */
	const [historyData, scenarioData] = await Promise.all([
		getHistory(region, dataType),
		getScenarios(model, scenario)
	]);

	const projection = scenarioData
		.filter((d) => filterScenarioData({ d, pathway, region, dataType }))
		.map((d) =>
			remappedProjectionData({
				d,
				model,
				fuel_tech: d.fuel_tech
			})
		);

	return {
		projection,
		history: historyData
	};
}

/**
 * Filter scenario data
 * @param {{ d: *, pathway: string, region: string, dataType: ScenarioDataType }} param0
 * @returns {boolean}
 */
function filterScenarioData({ d, pathway, region, dataType }) {
	return (
		d.pathway === pathway && d.region.toLowerCase() === region.toLowerCase() && d.type === dataType
	);
}

/**
 * Remap projection data
 * @param {{ d: *, model: string, fuel_tech: string |undefined }} param0
 * @returns {*}
 */
function remappedProjectionData({ d, model, fuel_tech }) {
	return {
		...d,
		model,
		fuel_tech
	};
}

/**
 * Fetch and process data for technology view
 * @param {{ model: string, region: string, scenario: string, pathway: string, dataType: ScenarioDataType }} param0
 * @returns {Promise<{ projection: StatsData[], history: StatsData[] }>}
 */
async function fetchTechnologyViewData({ model, region, scenario, pathway, dataType }) {
	if (dataType === 'energy' || dataType === 'capacity') {
		return fetchFuelTechData({ model, region, scenario, pathway, dataType });
	} else if (dataType === 'emissions') {
		return fetchEmissionsData({ model, region, scenario, pathway, dataType });
	}

	return {
		projection: [],
		history: []
	};
}

export { fetchTechnologyViewData };
