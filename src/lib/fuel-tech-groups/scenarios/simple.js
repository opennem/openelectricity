/**
 * Defining fuel tech grouping
 * - fuelTechMap: mapping of fuel techs to groups
 * - order: order of groups
 * - labels: labels for groups
 */

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const fuelTechMap = {
	storage_charging: [
		'pumps',
		'battery_charging',
		'battery_VPP_charging',
		'battery_distributed_charging'
	],
	exports: ['exports'],

	demand_response: ['demand_response'],
	imports: ['imports'],

	coal: ['coal_black', 'coal_brown'],

	bioenergy: ['bioenergy', 'bioenergy_biomass', 'bioenergy_biogas'],

	distillate: ['distillate'],

	gas: [
		'gas_ccgt',
		'gas_ccgt_ccs',
		'gas_ocgt',
		'gas_recip',
		'gas_steam',
		'gas_wcmg',
		'gas_hydrogen'
	],

	storage_discharging: [
		'battery',
		'battery_discharging',
		'battery_VPP_discharging',
		'battery_distributed_discharging'
	],

	hydro: ['hydro'],

	wind: ['wind', 'wind_offshore'],

	solar_utility: ['solar_utility'],
	solar_rooftop: ['solar_rooftop']
};

/** @type {Object.<FuelTechCode, string>}} */
const labels = {
	storage_discharging: 'Storage (Discharging)',
	storage_charging: 'Storage (Charging)',
	demand_response: 'Demand Response',
	exports: 'Exports',
	imports: 'Imports',
	coal: 'Coal',
	gas: 'Gas',
	bioenergy: 'Bioenergy',
	hydro: 'Hydro',
	wind: 'Wind',
	solar_utility: 'Solar (Utility)',
	solar_rooftop: 'Solar (Rooftop)'
};

/** @type {FuelTechCode[]} */
const order = [
	'storage_charging',
	'exports',

	'demand_response',
	'imports',

	'coal',

	'bioenergy',

	'distillate',

	'gas',

	'storage_discharging',

	'hydro',

	'wind',

	'solar_utility',
	'solar_rooftop'
];

/** @type {FuelTechGroup} */
export default Object.freeze({
	label: 'Simplified',
	value: 'simple',
	fuelTechs: fuelTechMap,
	order: order,
	labels: labels
});