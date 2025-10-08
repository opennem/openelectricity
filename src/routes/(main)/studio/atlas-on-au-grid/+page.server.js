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

	const fuelTechMap = {
		battery: ['battery_charging', 'battery_discharging'],
		bioenergy: ['bioenergy_biogas', 'bioenergy_biomass'],
		coal: ['coal_black', 'coal_brown'],
		distillate: ['distillate'],
		gas: ['gas_ccgt', 'gas_ocgt', 'gas_recip', 'gas_steam', 'gas_wcmg'],
		hydro: ['hydro'],
		pumps: ['pumps'],
		solar: ['solar_rooftop', 'solar_utility'],
		wind: ['wind']
	};

	const { searchParams } = url;
	const view = searchParams.get('view') || 'timeline';
	/* @type {import('openelectricity').UnitStatusType[]} */
	const statuses = searchParams.get('statuses')
		? /** @type {string} */ (searchParams.get('statuses')).split(',')
		: [];
	const regions = searchParams.get('regions')
		? /** @type {string} */ (searchParams.get('regions')).split(',')
		: [];
	const fuelTechs = searchParams.get('fuel_techs')
		? /** @type {string} */ (searchParams.get('fuel_techs')).split(',')
		: [];

	const fuelTechIds = fuelTechs.map((fuelTech) => fuelTechMap[fuelTech]).flat();

	console.log('fuelTechIds', fuelTechIds);
	console.log('regions', regions);

	let facilitiesResponse = null;
	// let committedResponse = null;
	// let retiredResponse = null;
	// let operationalResponse = null;

	try {
		const { response } = await client.getFacilities({
			fueltech_id: fuelTechIds,
			status_id: statuses
		});
		facilitiesResponse = response.data;
	} catch (error) {
		console.error(error);
	}

	// filter facilities by regions
	const facilities =
		regions.length <= 0
			? facilitiesResponse
			: facilitiesResponse
				? facilitiesResponse.filter((facility) =>
						regions.includes(facility.network_region.toLowerCase())
					)
				: [];

	// const facilities = facilitiesResponse;

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
		facilities,
		// committedFacilities: committedResponse || [],
		// retiredFacilities: retiredResponse || [],
		// operationalFacilities: operationalResponse || [],
		view,
		statuses,
		regions,
		fuelTechs
	};
}
