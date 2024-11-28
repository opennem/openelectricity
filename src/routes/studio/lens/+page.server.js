import { PUBLIC_EMBER_BRIDGE_API } from '$env/static/public';

export async function load({ fetch }) {
	// /api/countries
	// /v4/ember/AUS/monthly.json

	try {
		const response = await fetch(`${PUBLIC_EMBER_BRIDGE_API}/api/countries`);
		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status}`);
		}
		/** @type {EmberCountry[]} */
		const countries = await response.json();
		return { countries };
	} catch (error) {
		console.error(error);
		return { error: 'Unable to fetch countries' };
	}
}
