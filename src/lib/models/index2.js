import parser from './parser';

/**
 *
 * @param {string} model
 * @param {string} region
 * @param {string} type
 */
async function fetchModels(model, region, type) {
	const params = {
		name: model,
		region: region && region === 'NEM' ? '' : region,
		type: type || 'energy'
	};
	const queryStrings = new URLSearchParams(params);
	const models = await fetch('/api/models?' + queryStrings);
	return parser(await models.json());
}

export default fetchModels;
