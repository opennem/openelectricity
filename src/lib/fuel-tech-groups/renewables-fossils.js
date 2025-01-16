/**
 * Defining fuel tech grouping
 * - fuelTechMap: mapping of fuel techs to groups
 * - order: order of groups
 * - labels: labels for groups
 */

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const fuelTechMap = {
	battery_charging: ['battery_charging', 'battery_VPP_charging', 'battery_distributed_charging'],
	pumps: ['pumps'],
	exports: ['exports'],

	imports: ['imports'],
	fossil: [
		'coal_black',
		'coal_brown',
		'distillate',
		'gas_ccgt',
		'gas_ccgt_ccs',
		'gas_ocgt',
		'gas_recip',
		'gas_steam',
		'gas_wcmg',
		'gas_hydrogen'
	],
	renewable: [
		'bioenergy',
		'bioenergy_biomass',
		'bioenergy_biogas',
		'hydro',
		'wind',
		'wind_offshore',
		'solar_utility',
		'solar_rooftop'
	],
	battery_discharging: [
		'battery_discharging',
		'battery_VPP_discharging',
		'battery_distributed_discharging'
	]
};

/** @type {Object.<FuelTechCode, string>}} */
const labels = {
	battery_charging: 'Battery (Charging)',
	battery_discharging: 'Battery (Discharging)',
	pumps: 'Pumps',
	exports: 'Exports',
	imports: 'Imports',
	fossil: 'Fossils',
	renewable: 'Renewables'
};

/** @type {FuelTechCode[]} */
const order = [
	'battery_charging',
	'pumps',
	'exports',
	'imports',
	'battery_discharging',
	'fossil',
	'renewable'
];

// REDUCERS
/**
 * @param {Object.<string, string>} acc
 * @param {StatsData} d
 * @returns {Object.<string, string>}
 */
const fuelTechNameReducer = (acc, d) => {
	acc[d.id] = d.fuel_tech ? labels[d.fuel_tech] : '';
	return acc;
};

/** @type {FuelTechGroup} */
export default Object.freeze({
	label: 'Renewables/Fossils',
	value: 'rvf',
	fuelTechs: fuelTechMap,
	order,
	labels,
	fuelTechNameReducer
});
