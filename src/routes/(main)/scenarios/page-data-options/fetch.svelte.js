import { getScenarioJson, getScenarios } from '$lib/scenarios';
import { getHistory } from '$lib/opennem';
import parser from '$lib/opennem/parser';

import { covertHistoryDataToTWh, mergeHistoricalEmissionsData } from './utils';

// --- In-memory caches ---

/** @type {Map<string, { energyData: StatsData[], emissionsData: StatsData[] }>} */
const historyCache = new Map();

/** @type {Map<string, StatsData[]>} */
const capacityCache = new Map();

/** @type {Map<string, StatsData[]>} */
const scenarioCache = new Map();

/**
 * Fetch historical energy and emissions data from the legacy static JSON endpoint.
 * @param {string} region
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ energyData: StatsData[], emissionsData: StatsData[] }>}
 */
async function getEnergyAndEmissions(region, options) {
	if (historyCache.has(region)) return historyCache.get(region);

	const params = {
		region: region && region === 'NEM' ? '' : region
	};
	const queryStrings = new URLSearchParams(params);
	const response = await fetch('/api/energy?' + queryStrings, { signal: options?.signal });
	const json = await response.json();

	const result = {
		energyData: parser(json.data, 'energy'),
		emissionsData: parser(json.data, 'emissions')
	};

	if (!options?.signal?.aborted) {
		historyCache.set(region, result);
	}

	return result;
}

/**
 * Cached wrapper around getHistory for capacity data.
 * @param {string} region
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<StatsData[]>}
 */
async function getCachedCapacity(region, options) {
	if (capacityCache.has(region)) return capacityCache.get(region);

	const result = await getHistory(region, 'capacity', options);

	if (!options?.signal?.aborted) {
		capacityCache.set(region, result);
	}

	return result;
}

/**
 * Cached wrapper around getScenarios.
 * @param {string} model
 * @param {string} scenario
 * @param {Record<string, string>} filters
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<StatsData[]>}
 */
async function getCachedScenarios(model, scenario, filters, options) {
	const key = `${model}:${scenario}:${filters.pathway || ''}:${filters.region || ''}:${filters.dataType || ''}`;

	if (scenarioCache.has(key)) return scenarioCache.get(key);

	const result = await getScenarios(model, scenario, filters, options);

	if (!options?.signal?.aborted) {
		scenarioCache.set(key, result);
	}

	return result;
}

/**
 * Fetch data for Technology view Energy data
 * @param {{ model: string, region: string, scenario: string, pathway: string, dataType: ScenarioDataType }} param0
 */
async function fetchEmissionsData({ model, region, scenario, pathway, dataType }) {
	const [energyAndEmissions, scenarioData] = await Promise.all([
		getEnergyAndEmissions(region),
		getCachedScenarios(model, scenario, { pathway, region, dataType })
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
		getCachedScenarios(model, scenario, { pathway, region, dataType })
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
		getCachedCapacity(region, opts),
		getCachedScenarios(model, scenario, { pathway, region }, opts)
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
		getCachedCapacity(region)
	]);

	const historyEnergyData = energyAndEmissions.energyData;
	const historyEmisssionsData = energyAndEmissions.emissionsData;

	/** @type {StatsData[][]} */
	const scenariosProjection = await Promise.all(
		scenarios.map((s) => getCachedScenarios(s.model, s.scenario, { pathway: s.pathway, region }))
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
		getCachedScenarios(model, scenario, { pathway }),
		...regionsData.flatMap((r) => [
			getEnergyAndEmissions(r.value.toUpperCase()),
			getCachedCapacity(r.value.toUpperCase())
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
			.filter(
				(/** @type {any} */ d) => d.region.toLowerCase() === regionLower && d.type === 'energy'
			)
			.map((/** @type {any} */ d) => remappedProjectionData(d, model));

		r.projectionCapacityData = scenarioData
			.filter(
				(/** @type {any} */ d) => d.region.toLowerCase() === regionLower && d.type === 'capacity'
			)
			.map((/** @type {any} */ d) => remappedProjectionData(d, model));

		r.projectionEmissionsData = scenarioData
			.filter(
				(/** @type {any} */ d) => d.region.toLowerCase() === regionLower && d.type === 'emissions'
			)
			.map((/** @type {any} */ d) => remappedProjectionData(d, model));
	}

	return regionsData;
}

/** Clear all in-memory caches. Exposed for testing. */
export function clearCaches() {
	historyCache.clear();
	capacityCache.clear();
	scenarioCache.clear();
}

export { fetchTechnologyViewData, fetchScenarioViewData, fetchRegionViewData };
