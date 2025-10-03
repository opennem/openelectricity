import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';

let client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

export async function load({ url }) {
	// fueltech_id: ["coal_black", "coal_brown"]

	/**
	 * Available options:
	 * battery, battery_charging, battery_discharging, bioenergy_biogas, bioenergy_biomass, coal_black, coal_brown, distillate, gas_ccgt, gas_ocgt, gas_recip, gas_steam, gas_wcmg, hydro, pumps, solar_rooftop, solar_thermal, solar_utility, nuclear, other, solar, wind, wind_offshore, imports, exports, interconnector, aggregator_vpp, aggregator_dr
	 */

	const { searchParams } = url;
	const view = searchParams.get('view') || 'timeline';
	/* @type {import('openelectricity').UnitStatusType[]} */
	const statuses = searchParams.get('statuses')
		? /** @type {string} */ (searchParams.get('statuses')).split(',')
		: [];

	let facilitiesResponse = null;
	// let committedResponse = null;
	// let retiredResponse = null;
	// let operationalResponse = null;

	try {
		const { response } = await client.getFacilities({
			status_id: statuses
		});
		facilitiesResponse = response.data;
	} catch (error) {
		console.error(error);
	}

	// try {
	// 	const { response } = await client.getFacilities({
	// 		status_id: ['committed']
	// 	});
	// 	committedResponse = response.data;
	// } catch (error) {
	// 	console.error(error);
	// }

	// try {
	// 	const { response } = await client.getFacilities({
	// 		status_id: ['operating']
	// 	});
	// 	operationalResponse = response.data;
	// } catch (error) {
	// 	console.error(error);
	// }

	// try {
	// 	const { response } = await client.getFacilities({
	// 		status_id: ['retired']
	// 	});
	// 	retiredResponse = response.data;
	// } catch (error) {
	// 	console.error(error);
	// }

	return {
		facilities: facilitiesResponse || [],
		// committedFacilities: committedResponse || [],
		// retiredFacilities: retiredResponse || [],
		// operationalFacilities: operationalResponse || [],
		view,
		statuses
	};
}
