import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import isCommissioningCheck from '../_utils/is-commissioning';

let client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

export async function load({ url }) {
	/**
	 * Available options:
	 * battery, battery_charging, battery_discharging, bioenergy_biogas, bioenergy_biomass, coal_black, coal_brown, distillate, gas_ccgt, gas_ocgt, gas_recip, gas_steam, gas_wcmg, hydro, pumps, solar_rooftop, solar_thermal, solar_utility, nuclear, other, solar, wind, wind_offshore, imports, exports, interconnector, aggregator_vpp, aggregator_dr
	 */

	/** @type {Record<string, string[]>} */
	const fuelTechMap = {
		battery: ['battery', 'battery_charging', 'battery_discharging'],
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
		: ['operating', 'commissioning'];
	const regions = searchParams.get('regions')
		? /** @type {string} */ (searchParams.get('regions')).split(',')
		: [];
	const fuelTechs = searchParams.get('fuel_techs')
		? /** @type {string} */ (searchParams.get('fuel_techs')).split(',')
		: [];
	const sizes = searchParams.get('sizes')
		? /** @type {string} */ (searchParams.get('sizes')).split(',').filter(Boolean)
		: [];

	const fuelTechIds = fuelTechs.map((fuelTech) => fuelTechMap[fuelTech]).flat();

	// console.log('fuelTechIds', fuelTechIds);
	// console.log('regions', regions);
	// console.log('statuses', statuses);

	/**
	 * Commissioning status is not included in the API, so we need to add it manually.
	 */
	let newStatuses = [];
	// if statuses includes only commissioning, add operating to statuses and always remove commissioning.
	if (statuses.includes('commissioning') && statuses.length === 1) {
		newStatuses.push('operating');
	} else if (statuses.includes('commissioning') && !statuses.includes('operating')) {
		newStatuses = statuses.filter((status) => status !== 'commissioning');
		newStatuses.push('operating');
	} else {
		newStatuses = statuses.filter((status) => status !== 'commissioning');
	}

	let facilitiesResponse = null;

	try {
		const { response } = await client.getFacilities({
			fueltech_id: fuelTechIds,
			status_id: newStatuses
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

	// mark facilities as commissioning if any unit is commissioning
	facilities?.forEach((facility) => {
		facility.units.forEach((unit) => {
			if (isCommissioningCheck(unit)) {
				/** @type {any} */ (unit).isCommissioning = true;
				/** @type {any} */ (unit).status_id = 'commissioning';
			}
		});
	});

	/** @type {any[]} */
	let newFacilities = [];
	facilities?.forEach((facility) => {
		newFacilities.push({
			...facility,
			units: facility.units.filter((unit) => {
				return unit.status_id && statuses.includes(unit.status_id);
			})
		});
	});

	return {
		facilities: newFacilities,
		view,
		statuses,
		regions,
		fuelTechs,
		sizes
	};
}
