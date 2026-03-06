import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

export async function GET({ url, setHeaders }) {
	const networkCode = /** @type {import('openelectricity').NetworkCode} */ (
		url.searchParams.get('network_code') || 'NEM'
	);
	const networkRegion = url.searchParams.get('network_region') || undefined;
	const intervalParam = url.searchParams.get('interval') || '5m';
	const dateStartParam = url.searchParams.get('date_start') || undefined;
	const dateEndParam = url.searchParams.get('date_end') || undefined;

	try {
		/** @type {import('openelectricity').IMarketTimeSeriesParams} */
		const options = {
			interval: /** @type {any} */ (intervalParam),
			dateStart: dateStartParam,
			dateEnd: dateEndParam,
			network_region: networkRegion
		};

		const { response } = await client.getMarket(
			networkCode,
			[/** @type {import('openelectricity').MarketMetric} */ ('price')],
			options
		);

		setHeaders({
			'Cache-Control': 'public, max-age=300'
		});

		return Response.json({
			network_code: networkCode,
			network_region: networkRegion,
			response
		});
	} catch (err) {
		console.error('Error fetching market price data:', err);
		return Response.json(
			{
				error: /** @type {any} */ (err).message,
				details: /** @type {any} */ (err).details
			},
			{ status: 500 }
		);
	}
}
