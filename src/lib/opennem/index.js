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

export default getHistory;
