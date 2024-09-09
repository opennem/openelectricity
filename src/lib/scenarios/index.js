import parser from './parser';

/**
 * Get scenarios
 * @param {string} name
 * @param {string} scenario
 */
async function getScenarioJson(name = 'aemo2024', scenario = 'step_change') {
	const params = {
		name,
		scenario
	};
	const queryStrings = new URLSearchParams(params);
	const scenarioData = await fetch('/api/scenarios?' + queryStrings);
	const data = await scenarioData.json();

	return parser(data);
}

/**
 * Get scenarios
 * @param {string} name
 * @param {string} scenario
 */
async function getScenarios(name = 'aemo2024', scenario = 'step_change') {
	const params = {
		name,
		scenario
	};
	const queryStrings = new URLSearchParams(params);
	const scenarioData = await fetch('/api/scenarios?' + queryStrings);
	const jsonData = await scenarioData.json();

	return jsonData.data;
}

export { getScenarioJson, getScenarios };
