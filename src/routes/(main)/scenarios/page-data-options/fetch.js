import { getScenarioJson, getScenarios } from '$lib/scenarios';
import { getHistory } from '$lib/opennem';
import parser from '$lib/opennem/parser';

import { covertHistoryDataToTWh, mergeHistoricalEmissionsData } from './utils';

/**
 * Fetch energy endpoint once and parse for both 'energy' and 'emissions' data types.
 * Avoids duplicate HTTP requests since both use the same URL.
 * @param {string} region
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ energyData: StatsData[], emissionsData: StatsData[] }>}
 */
async function getEnergyAndEmissions(region, options) {
	const params = {
		region: region && region === 'NEM' ? '' : region
	};
	const queryStrings = new URLSearchParams(params);
	const response = await fetch('/api/energy?' + queryStrings, { signal: options?.signal });
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
		getScenarios(model, scenario, { pathway, region, dataType })
	]);

	const historyEmisssionsData = energyAndEmissions.emissionsData;
	const historyEnergyData = energyAndEmissions.energyData;

	const projection = scenarioData.map((/** @type {any} */ d) =>
		remappedProjectionData(
			{
				...d,
				fuel_tech: 'fossil_fuels'
			},
			model
		)
	);

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
		getScenarios(model, scenario, { pathway, region, dataType })
	]);

	const projection = scenarioData.map((/** @type {any} */ d) => remappedProjectionData(d, model));

	return {
		projection,
		history: historyData
	};
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
 * @param {{ model: string, region: string, scenario: string, pathway: string, signal?: AbortSignal }} param0
 * @returns {Promise<{
 * projectionEnergyData: StatsData[],
 * projectionCapacityData: StatsData[],
 * projectionEmissionsData: StatsData[],
 * historyEnergyData: StatsData[],
 * historyCapacityData: StatsData[],
 * historyEmisssionsData: StatsData[]
 * }>}
 */
async function fetchTechnologyViewData({ model, region, scenario, pathway, signal }) {
	const opts = signal ? { signal } : undefined;
	const [energyAndEmissions, historyCapacityData, scenarioData] = await Promise.all([
		getEnergyAndEmissions(region, opts),
		getHistory(region, 'capacity', opts),
		getScenarios(model, scenario, { pathway, region }, opts)
	]);

	const historyEnergyData = energyAndEmissions.energyData;
	const historyEmisssionsData = energyAndEmissions.emissionsData;

	const projectionEnergyData = scenarioData
		.filter((/** @type {any} */ d) => d.type === 'energy')
		.map((/** @type {any} */ d) => remappedProjectionData(d, model));

	const projectionCapacityData = scenarioData
		.filter((/** @type {any} */ d) => d.type === 'capacity')
		.map((/** @type {any} */ d) => remappedProjectionData(d, model));

	const projectionEmissionsData = scenarioData
		.filter((/** @type {any} */ d) => d.type === 'emissions')
		.map((/** @type {any} */ d) => remappedProjectionData(d, model));

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
		scenarios.map((s) => getScenarios(s.model, s.scenario, { pathway: s.pathway, region }))
	);

	const projectionsData = scenarios.map((s, i) => {
		const projectionEnergyData = scenariosProjection[i]
			.filter((/** @type {any} */ d) => d.type === 'energy')
			.map((/** @type {any} */ d) => remappedProjectionData(d, s.model));

		const projectionCapacityData = scenariosProjection[i]
			.filter((/** @type {any} */ d) => d.type === 'capacity')
			.map((/** @type {any} */ d) => remappedProjectionData(d, s.model));

		const projectionEmissionsData = scenariosProjection[i]
			.filter((/** @type {any} */ d) => d.type === 'emissions')
			.map((/** @type {any} */ d) => remappedProjectionData(d, s.model));

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

	// Fetch scenario data (all regions for this pathway), and energy+emissions + capacity per region, all in parallel
	const [scenarioData, ...regionResults] = await Promise.all([
		getScenarios(model, scenario, { pathway }),
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

		const regionLower = r.value.toLowerCase();
		r.projectionEnergyData = scenarioData
			.filter((/** @type {any} */ d) => d.region.toLowerCase() === regionLower && d.type === 'energy')
			.map((/** @type {any} */ d) => remappedProjectionData(d, model));

		r.projectionCapacityData = scenarioData
			.filter((/** @type {any} */ d) => d.region.toLowerCase() === regionLower && d.type === 'capacity')
			.map((/** @type {any} */ d) => remappedProjectionData(d, model));

		r.projectionEmissionsData = scenarioData
			.filter((/** @type {any} */ d) => d.region.toLowerCase() === regionLower && d.type === 'emissions')
			.map((/** @type {any} */ d) => remappedProjectionData(d, model));
	}

	return regionsData;
}

export { fetchTechnologyViewData, fetchScenarioViewData, fetchRegionViewData };
