import { flatten } from 'layercake';
import parser from './parser';

/**
 *
 * @param {string} region
 * @param {string} dataType
 */
async function getHistory(region, dataType = 'energy') {
	const params = {
		region: region && region === 'NEM' ? '' : region
	};
	const queryStrings = new URLSearchParams(params);

	if (dataType === 'capacity') {
		const capacity = await fetch('/api/capacity?' + queryStrings);
		const capacityJson = await capacity.json();
		return capacityJson;
	}

	const history = await fetch('/api/energy?' + queryStrings);
	const historyJson = await history.json();
	return parser(historyJson.data, dataType);
}

async function getAllRegionHistory(dataType = 'energy') {
	const history = await fetch('/api/energy/all-regions');
	const historyJson = await history.json();

	const parsed = historyJson.map((/** @type {any} */ d) => parser(d.data, dataType));
	return flatten(parsed);
}

export { getHistory, getAllRegionHistory };
