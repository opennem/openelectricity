import parser from './parser';

/**
 *
 * @param {string} model
 * @param {string} region
 */
async function fetchModels(model, region) {
	const params = {
		name: model,
		region: region && region === 'NEM' ? '' : region
	};
	const queryStrings = new URLSearchParams(params);
	const models = await fetch('/api/models?' + queryStrings);
	return parser(await models.json());
}

export default fetchModels;
