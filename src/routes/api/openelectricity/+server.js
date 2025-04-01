import { error } from '@sveltejs/kit';
import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

let client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

export async function GET({ url, setHeaders }) {
	let { searchParams } = url;
	let dataType = /** @type {'market' | 'network' | undefined} */ (searchParams.get('dataType'));
	let networkId = /** @type {import('openelectricity').NetworkCode | undefined} */ (
		searchParams.get('networkId')
	);
	let metric =
		/** @type {import('openelectricity').DataMetric | import('openelectricity').MarketMetric | undefined} */ (
			searchParams.get('metric')
		);
	let interval = /** @type {import('openelectricity').DataInterval | undefined} */ (
		searchParams.get('interval')
	);
	let dateStart = /** @type {string | undefined} */ (searchParams.get('dateStart'));
	let dateEnd = /** @type {string | undefined} */ (searchParams.get('dateEnd'));
	let primaryGrouping = /** @type {import('openelectricity').DataPrimaryGrouping | undefined} */ (
		searchParams.get('primaryGrouping')
	);
	let secondaryGrouping =
		/** @type {import('openelectricity').DataSecondaryGrouping | undefined} */ (
			searchParams.get('secondaryGrouping')
		);
	let secondaryGroupingArray = secondaryGrouping ? [secondaryGrouping] : undefined;
	let fueltechGroup = /** @type {import('openelectricity').UnitFueltechGroupType | undefined} */ (
		searchParams.get('fueltechGroup')
	);
	let fueltechGroupArray = fueltechGroup ? [fueltechGroup] : undefined;
	let networkRegion = /** @type {string | undefined} */ (searchParams.get('networkRegion'));

	if (!dataType || !networkId || !metric) {
		return error(400, 'Missing required parameters');
	}

	// console.log('dataType', dataType);
	// console.log('networkId', networkId);
	// console.log('metric', metric);
	// console.log('interval', interval);
	// console.log('dateStart', dateStart);
	// console.log('dateEnd', dateEnd);
	// console.log('primaryGrouping', primaryGrouping);
	// console.log('secondaryGrouping', secondaryGrouping);
	// console.log('fueltechGroup', fueltechGroup);
	// console.log('networkRegion', networkRegion);

	/** @type {import('openelectricity').INetworkTimeSeriesParams} */
	let clientOptions = {
		interval: interval,
		dateStart: dateStart,
		dateEnd: dateEnd,
		primaryGrouping: primaryGrouping,
		secondaryGrouping: secondaryGroupingArray,
		fueltech_group: fueltechGroupArray,
		network_region: networkRegion
	};

	let res;

	if (dataType === 'network') {
		let networkMetric = /** @type {import('openelectricity').DataMetric} */ (metric);
		let start = performance.now();
		res = await client.getNetworkData(networkId, [networkMetric], clientOptions);
		let end = performance.now();
		let responseTime = end - start;

		console.log(`getNetworkData took ${responseTime.toFixed(2)} ms`);
	} else {
		let marketMetric = /** @type {import('openelectricity').MarketMetric} */ (metric);
		let start = performance.now();
		res = await client.getMarket(networkId, [marketMetric], clientOptions);
		let end = performance.now();
		let responseTime = end - start;

		console.log(`getMarket took ${responseTime.toFixed(2)} ms`);
	}

	return Response.json(res.response);
}
