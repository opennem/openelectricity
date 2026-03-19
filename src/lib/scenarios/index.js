import parser from './parser';

/**
 * Get scenario data with metadata (pathways, fuelTechs)
 * @param {string} name
 * @param {string} scenario
 * @param {{ pathway?: string, region?: string, dataType?: string }} [filters]
 * @param {{ signal?: AbortSignal }} [options]
 */
async function getScenarioJson(name = 'aemo2024', scenario = 'step_change', filters = {}, options) {
	const params = { name, scenario, ...filters };
	const queryStrings = new URLSearchParams(
		Object.fromEntries(Object.entries(params).filter(([, v]) => v))
	);
	const scenarioData = await fetch('/api/scenarios?' + queryStrings, { signal: options?.signal });
	const data = await scenarioData.json();

	return parser(data);
}

/**
 * Get scenario data array only
 * @param {string} name
 * @param {string} scenario
 * @param {{ pathway?: string, region?: string, dataType?: string }} [filters]
 * @param {{ signal?: AbortSignal }} [options]
 */
async function getScenarios(name = 'aemo2024', scenario = 'step_change', filters = {}, options) {
	const params = { name, scenario, ...filters };
	const queryStrings = new URLSearchParams(
		Object.fromEntries(Object.entries(params).filter(([, v]) => v))
	);
	const scenarioData = await fetch('/api/scenarios?' + queryStrings, { signal: options?.signal });
	const jsonData = await scenarioData.json();

	return jsonData.data;
}

export { getScenarioJson, getScenarios };
