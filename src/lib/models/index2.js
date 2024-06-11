import { flatten } from 'layercake';
import parser from './parser';

/**
 *
 * @param {string} model
 * @param {string} region
 * @param {string} type
 */
async function getModels(model, region, type) {
	const params = {
		name: model,
		region: region && region === 'NEM' ? '' : region,
		type: type || 'energy'
	};
	const queryStrings = new URLSearchParams(params);
	const models = await fetch('/api/models?' + queryStrings);
	return parser(await models.json());
}

/**
 *
 * @param {string} model
 * @param {string} type
 * @returns
 */
async function getAllRegionModels(model, type) {
	const params = {
		name: model,
		type: type || 'energy'
	};
	const queryStrings = new URLSearchParams(params);
	const models = await fetch('/api/models/all-regions?' + queryStrings);
	const modelsJson = await models.json();

	const parsed = modelsJson.map((d) => parser(d));
	return flatten(parsed);
}

export { getModels, getAllRegionModels };
