/**
 * Defining fuel tech grouping
 * - fuelTechMap: mapping of fuel techs to groups
 * - order: order of groups
 * - labels: labels for groups
 */

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const fuelTechMap = {
	battery_charging: ['battery_charging', 'battery_VPP_charging', 'battery_distributed_charging'],
	demand_response: ['demand_response'],
	exports: ['exports'],

	imports: ['imports'],
	coal: ['coal_black', 'coal_brown'],
	gas: [
		'gas_ccgt',
		'gas_ccgt_ccs',
		'gas_ocgt',
		'gas_recip',
		'gas_steam',
		'gas_wcmg',
		'gas_hydrogen'
	],
	distillate: ['distillate'],

	bioenergy: ['bioenergy', 'bioenergy_biomass', 'bioenergy_biogas'],
	hydro: ['hydro'],

	battery: ['battery'],
	battery_discharging: [
		'battery_discharging',
		'battery_VPP_discharging',
		'battery_distributed_discharging'
	],

	wind: ['wind', 'wind_offshore'],
	solar_utility: ['solar_utility'],
	solar_rooftop: ['solar_rooftop']
};

/** @type {Object.<FuelTechCode, string>}} */
const labels = {
	battery: 'Battery',
	battery_charging: 'Battery (Charging)',
	battery_discharging: 'Battery (Discharging)',
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
	'battery_charging',
	'exports',

	'demand_response',
	'imports',

	'coal',
	'bioenergy',
	'distillate',
	'gas',

	'battery',
	'battery_discharging',
	'hydro',

	'wind',
	'solar_utility',
	'solar_rooftop'
];

/** @type {FuelTechGroup} */
export default {
	label: 'Default',
	value: 'simple',
	fuelTechs: fuelTechMap,
	order: order,
	labels: labels
};
