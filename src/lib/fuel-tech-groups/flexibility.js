/**
 * Defining fuel tech grouping
 * - fuelTechMap: mapping of fuel techs to groups
 * - order: order of groups
 * - labels: labels for groups
 *
 * Port of the legacy explore tool's Flexibility grouping (opennem-fe
 * `group.flexibility`): variable sources (wind and solar), fast flexible
 * plant (hydro, peaking gas, batteries, distillate) and slow flexible plant
 * (coal, steam gas, bioenergy). Extended to this app's fuller network
 * leaf-code vocabulary.
 */

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const fuelTechMap = {
	battery_charging: ['battery_charging', 'battery_VPP_charging', 'battery_distributed_charging'],
	pumps: ['pumps'],
	exports: ['exports'],

	demand_response: ['demand_response'],
	imports: ['imports'],

	slow_flexible: [
		'coal_black',
		'coal_brown',
		'bioenergy',
		'bioenergy_biomass',
		'bioenergy_biogas',
		'gas_steam'
	],

	// The aggregate `battery` series maps here too, matching the legacy
	// grouping; the processor drops it whenever the charge/discharge splits
	// are present, so it never double-counts.
	fast_flexible: [
		'hydro',
		'gas_ccgt',
		'gas_ccgt_ccs',
		'gas_ocgt',
		'gas_recip',
		'gas_wcmg',
		'gas_hydrogen',
		'distillate',
		'battery_discharging',
		'battery_VPP_discharging',
		'battery_distributed_discharging',
		'battery'
	],

	variable: ['solar_utility', 'solar_rooftop', 'wind', 'wind_offshore']
};

/** @type {Object.<FuelTechCode, string>}} */
const labels = {
	battery_charging: 'Battery (Charging)',
	pumps: 'Pumps',
	exports: 'Exports',
	demand_response: 'Demand Response',
	imports: 'Imports',
	slow_flexible: 'Slow flexible',
	fast_flexible: 'Fast flexible',
	variable: 'Variable'
};

/** @type {FuelTechCode[]} */
const order = [
	'battery_charging',
	'pumps',
	'exports',

	'demand_response',
	'imports',

	'slow_flexible',

	'fast_flexible',

	'variable'
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
	label: 'Flexibility',
	value: 'flexibility',
	fuelTechs: fuelTechMap,
	order,
	labels,
	fuelTechNameReducer
});
