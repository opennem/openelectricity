/**
 * Defining fuel tech grouping
 * - fuelTechMap: mapping of fuel techs to groups
 * - order: order of groups
 * - labels: labels for groups
 *
 * Port of the legacy explore tool's Coal/Gas/Renewables grouping
 * (opennem-fe `group.coal-gas-renewables`), extended to this app's fuller
 * network leaf-code vocabulary (offshore wind, CCS/hydrogen gas, VPP and
 * distributed battery splits, demand response).
 */

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const fuelTechMap = {
	battery_charging: ['battery_charging', 'battery_VPP_charging', 'battery_distributed_charging'],
	pumps: ['pumps'],
	exports: ['exports'],

	demand_response: ['demand_response'],
	imports: ['imports'],

	coal: ['coal_black', 'coal_brown'],

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

	// The aggregate `battery` series maps here too, matching the legacy
	// grouping; the processor drops it whenever the charge/discharge splits
	// are present, so it never double-counts.
	battery_discharging: [
		'battery_discharging',
		'battery_VPP_discharging',
		'battery_distributed_discharging',
		'battery'
	],

	renewables: [
		'solar_utility',
		'solar_rooftop',
		'wind',
		'wind_offshore',
		'hydro',
		'bioenergy',
		'bioenergy_biomass',
		'bioenergy_biogas'
	]
};

/** @type {Object.<FuelTechCode, string>}} */
const labels = {
	battery_charging: 'Battery (Charging)',
	pumps: 'Pumps',
	exports: 'Exports',
	demand_response: 'Demand Response',
	imports: 'Imports',
	coal: 'Coal',
	distillate: 'Distillate',
	gas: 'Gas',
	battery_discharging: 'Battery (Discharging)',
	renewables: 'Renewables'
};

/** @type {FuelTechCode[]} */
const order = [
	'battery_charging',
	'pumps',
	'exports',

	'demand_response',
	'imports',

	'coal',

	'distillate',

	'gas',

	'battery_discharging',

	'renewables'
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
	label: 'Coal/Gas/Renewables',
	value: 'cgr',
	fuelTechs: fuelTechMap,
	order,
	labels,
	fuelTechNameReducer
});
