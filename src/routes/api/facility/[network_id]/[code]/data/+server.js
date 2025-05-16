import { error } from '@sveltejs/kit';
import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

let client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

export async function GET({ params, url, fetch }) {
	const { searchParams } = url;
	const networkId = /** @type {import('openelectricity').NetworkCode} */ (params.network_id);
	const code = params.code;
	// const period = searchParams.get('period') || '1d';

	if (!networkId || !code) {
		return error(400, 'Missing required parameters');
	}

	const { response } = await client.getFacilityData(networkId, code, ['power', 'market_value'], {
		interval: '5m',
		dateStart: '2024-01-01T00:00:00',
		dateEnd: '2024-01-06T00:00:00'
	});

	return Response.json(response);
}
