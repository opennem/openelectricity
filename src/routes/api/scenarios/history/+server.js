import { error } from '@sveltejs/kit';
import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { transformOeToStatsData } from './transform.js';

let client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

/** @type {import('openelectricity').INetworkTimeSeriesParams} */
const baseParams = {
	interval: '1M',
	secondaryGrouping: ['fueltech'],
	dateStart: '2010-01-01'
};

export async function GET({ url, setHeaders }) {
	let { searchParams } = url;
	let region = searchParams.get('region') || '';
	let metrics = searchParams.get('metrics') || 'energy,emissions';

	let metricList = /** @type {import('openelectricity').DataMetric[]} */ (
		metrics.split(',').filter(Boolean)
	);

	if (metricList.length === 0) {
		return error(400, 'No metrics specified');
	}

	/** @type {import('openelectricity').INetworkTimeSeriesParams} */
	let params = {
		...baseParams,
		network_region: region && region !== 'NEM' && region !== '_all' ? region : undefined
	};

	let start = performance.now();

	/** @type {Record<string, StatsData[]>} */
	let result = {};

	let responses = await Promise.allSettled(
		metricList.map((metric) => client.getNetworkData('NEM', [metric], params))
	);

	for (let i = 0; i < metricList.length; i++) {
		let metric = metricList[i];
		let res = responses[i];

		if (res.status === 'fulfilled') {
			let timeSeries = res.value.response.data;
			result[metric] = timeSeries.length > 0 ? transformOeToStatsData(timeSeries[0]) : [];
		} else {
			console.warn(`scenarios/history: ${metric} failed —`, res.reason?.message);
			result[metric] = [];
		}
	}

	let end = performance.now();
	console.log(`scenarios/history took ${(end - start).toFixed(2)} ms`);

	setHeaders({
		'cache-control': 'public, max-age=3600, s-maxage=86400',
		vary: 'Accept-Encoding'
	});

	return Response.json(result);
}
