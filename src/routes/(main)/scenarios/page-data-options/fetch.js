import { getScenarioJson, getScenarios } from '$lib/scenarios';
import { getHistory } from '$lib/opennem';
import parser from '$lib/opennem/parser';

import { covertHistoryDataToTWh, mergeHistoricalEmissionsData } from './utils';

/**
 * Fetch energy endpoint once and parse for both 'energy' and 'emissions' data types.
 * Avoids duplicate HTTP requests since both use the same URL.
 * @param {string} region
 * @returns {Promise<{ energyData: StatsData[], emissionsData: StatsData[] }>}
 */
async function getEnergyAndEmissions(region) {
	const params = {
		region: region && region === 'NEM' ? '' : region
	};
	const queryStrings = new URLSearchParams(params);
	const response = await fetch('/api/energy?' + queryStrings);
	const json = await response.json();

	return {
		energyData: parser(json.data, 'energy'),
		emissionsData: parser(json.data, 'emissions')
	};
}

/**
 * Fetch data for Technology view Energy data
 * @param {{ model: string, region: string, scenario: string, pathway: string, dataType: ScenarioDataType }} param0
 */
async function fetchEmissionsData({ model, region, scenario, pathway, dataType }) {
	const [energyAndEmissions, scenarioData] = await Promise.all([
		getEnergyAndEmissions(region),
		getScenarios(model, scenario)
	]);

	const historyEmisssionsData = energyAndEmissions.emissionsData;
	const historyEnergyData = energyAndEmissions.energyData;

	const projection = scenarioData
		.filter((/** @type {any} */ d) => filterScenarioData({ d, pathway, region, dataType }))
		.map((/** @type {any} */ d) =>
			remappedProjectionData(
				{
					...d,
					fuel_tech: 'fossil_fuels'
				},
				model
			)
		);

	// let energyHistoryData = [];

	// if (dataType === 'emissions') {

	const history = mergeHistoricalEmissionsData(/** @type {any} */ (historyEmisssionsData), true);

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
		.filter((/** @type {any} */ d) => filterScenarioData({ d, pathway, region, dataType }))
		.map((/** @type {any} */ d) => remappedProjectionData(d, model));

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
 * @param {*} data
 * @param {string} model
 * @returns {*}
 */
function remappedProjectionData(data, model) {
	return {
		...data,
		model,
		fuel_tech: data.fuel_tech
	};
}

/**
 * Fetch and process data for technology view
 * @param {{ model: string, region: string, scenario: string, pathway: string }} param0
 * @returns {Promise<{
 * projectionEnergyData: StatsData[],
 * projectionCapacityData: StatsData[],
 * projectionEmissionsData: StatsData[],
 * historyEnergyData: StatsData[],
 * historyCapacityData: StatsData[],
 * historyEmisssionsData: StatsData[]
 * }>}
 */
async function fetchTechnologyViewData({ model, region, scenario, pathway }) {
	const [energyAndEmissions, historyCapacityData, scenarioData] = await Promise.all([
		getEnergyAndEmissions(region),
		getHistory(region, 'capacity'),
		getScenarios(model, scenario)
	]);

	const historyEnergyData = energyAndEmissions.energyData;
	const historyEmisssionsData = energyAndEmissions.emissionsData;

	const projectionEnergyData = scenarioData
		.filter((d) => filterScenarioData({ d, pathway, region, dataType: 'energy' }))
		.map((d) => remappedProjectionData(d, model));

	const projectionCapacityData = scenarioData
		.filter((d) => filterScenarioData({ d, pathway, region, dataType: 'capacity' }))
		.map((d) => remappedProjectionData(d, model));

	const projectionEmissionsData = scenarioData
		.filter((d) => filterScenarioData({ d, pathway, region, dataType: 'emissions' }))
		.map((d) => remappedProjectionData(d, model));

	return {
		projectionEnergyData,
		projectionCapacityData,
		projectionEmissionsData,
		historyEnergyData,
		historyCapacityData,
		historyEmisssionsData
	};
}

/**
 *
 * @param {{
 *  scenarios: ScenarioSelect[],
 * 	region: string
 * }} param0
 * @returns {Promise<{
 * projectionsData: {
 * 	id: string,
 * 	model: string,
 * 	scenario: string,
 * 	pathway: string,
 * 	projectionEnergyData: StatsData[],
 * 	projectionCapacityData: StatsData[],
 * 	projectionEmissionsData: StatsData[]
 * }[],
 * historyEnergyData: StatsData[],
 * historyCapacityData: StatsData[],
 * historyEmisssionsData: StatsData[]
 * }>}
 */
async function fetchScenarioViewData({ scenarios, region }) {
	const [energyAndEmissions, historyCapacityData] = await Promise.all([
		getEnergyAndEmissions(region),
		getHistory(region, 'capacity')
	]);

	const historyEnergyData = energyAndEmissions.energyData;
	const historyEmisssionsData = energyAndEmissions.emissionsData;

	/** @type {StatsData[][]} */
	const scenariosProjection = await Promise.all(
		scenarios.map((s) => getScenarios(s.model, s.scenario))
	);

	const projectionsData = scenarios.map((s, i) => {
		const projectionEnergyData = scenariosProjection[i]
			.filter((d) => filterScenarioData({ d, pathway: s.pathway, region, dataType: 'energy' }))
			.map((d) => remappedProjectionData(d, s.model));

		const projectionCapacityData = scenariosProjection[i]
			.filter((d) => filterScenarioData({ d, pathway: s.pathway, region, dataType: 'capacity' }))
			.map((d) => remappedProjectionData(d, s.model));

		const projectionEmissionsData = scenariosProjection[i]
			.filter((d) => filterScenarioData({ d, pathway: s.pathway, region, dataType: 'emissions' }))
			.map((d) => remappedProjectionData(d, s.model));

		return {
			...s,
			projectionEnergyData,
			projectionCapacityData,
			projectionEmissionsData
		};
	});

	return {
		projectionsData,
		historyEnergyData,
		historyCapacityData,
		historyEmisssionsData
	};
}

/**
 * Fetch and process data for region view
 * @param {{ regions: any[], model: string, scenario: string, pathway: string }} param0
 */
async function fetchRegionViewData({ regions, model, scenario, pathway }) {
	const regionsData = [...regions];

	// Fetch scenario data, and energy+emissions (single request) + capacity per region, all in parallel
	const [scenarioData, ...regionResults] = await Promise.all([
		getScenarios(model, scenario),
		...regionsData.flatMap((r) => [
			getEnergyAndEmissions(r.value.toUpperCase()),
			getHistory(r.value.toUpperCase(), 'capacity')
		])
	]);

	for (let i = 0; i < regionsData.length; i++) {
		const r = regionsData[i];
		const base = i * 2;

		r.id = r.value;
		r.historicalEnergyData = regionResults[base].energyData;
		r.historicalEmissionsData = regionResults[base].emissionsData;
		r.historicalCapacityData = regionResults[base + 1];

		r.projectionEnergyData = scenarioData
			.filter((/** @type {any} */ d) => filterScenarioData({ d, pathway, region: r.value, dataType: 'energy' }))
			.map((/** @type {any} */ d) => remappedProjectionData(d, model));

		r.projectionCapacityData = scenarioData
			.filter((/** @type {any} */ d) => filterScenarioData({ d, pathway, region: r.value, dataType: 'capacity' }))
			.map((/** @type {any} */ d) => remappedProjectionData(d, model));

		r.projectionEmissionsData = scenarioData
			.filter((/** @type {any} */ d) => filterScenarioData({ d, pathway, region: r.value, dataType: 'emissions' }))
			.map((/** @type {any} */ d) => remappedProjectionData(d, model));
	}

	return regionsData;
}

export { fetchTechnologyViewData, fetchScenarioViewData, fetchRegionViewData };
