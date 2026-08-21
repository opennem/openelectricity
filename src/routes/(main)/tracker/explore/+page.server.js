import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

export async function load({ setHeaders }) {
	/** @type {any[]} */
	let facilities = [];
	try {
		const { response } = await client.getFacilities();
		facilities = (response.data ?? [])
			.map((facility) => ({
				code: facility.code,
				name: facility.name,
				network_id: facility.network_id,
				network_region: facility.network_region,
				units: (facility.units ?? []).map((unit) => ({
					code: unit.code,
					fueltech_id: unit.fueltech_id,
					dispatch_type: unit.dispatch_type
				}))
			}))
			.filter((facility) => facility.code && ['NEM', 'WEM'].includes(facility.network_id))
			.sort((a, b) => a.name.localeCompare(b.name));
	} catch (err) {
		console.error(
			JSON.stringify({
				message: 'Unable to load facilities for Tracker Explore',
				error: /** @type {any} */ (err).message
			})
		);
	}

	setHeaders({ 'cache-control': 'public, max-age=1800' });
	return { facilities, fullscreen: true };
}
