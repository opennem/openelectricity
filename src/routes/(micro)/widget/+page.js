import { regionsWithDataPaths } from './helpers/regions';

export async function load({ url, fetch }) {
	let { searchParams } = url;
	let region = searchParams.get('region') || 'NEM';
	let range = /** @type {RangeType} */ (searchParams.get('range') || '7d');
	let interval = searchParams.get('interval') || '30m';
	let regionPath = regionsWithDataPaths[region];

	let res = await fetch(`/api/tracker/${range}?regionPath=${regionPath}`);
	let dataset = await res.json();

	return {
		dataset,
		region,
		range,
		interval
	};
}
