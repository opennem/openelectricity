import { flatten } from 'layercake';
import parser from './parser';

/**
 *
 * @param {string} region
 */
async function getHistory(region) {
	const params = {
		region: region && region === 'NEM' ? '' : region
	};
	const queryStrings = new URLSearchParams(params);
	const history = await fetch('/api/energy?' + queryStrings);
	const historyJson = await history.json();
	return parser(historyJson.data);
}

async function getAllRegionHistory() {
	const history = await fetch('/api/energy/all-regions');
	const historyJson = await history.json();

	const parsed = historyJson.map((d) => parser(d.data));
	console.log('history all', historyJson, parsed, flatten(parsed));
	return flatten(parsed);
}

export { getHistory, getAllRegionHistory };
