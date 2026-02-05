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

	demand_response: ['demand_response'],
	exports: ['exports'],

	imports: ['imports'],

	coal_black: ['coal_black'],
	coal_brown: ['coal_brown'],

	gas_ccgt: ['gas_ccgt'],
	gas_ccgt_ccs: ['gas_ccgt_ccs'],
	gas_ocgt: ['gas_ocgt'],
	gas_recip: ['gas_recip'],
	gas_steam: ['gas_steam'],
	gas_wcmg: ['gas_wcmg'],
	gas_hydrogen: ['gas_hydrogen'],

	bioenergy_biomass: ['bioenergy_biomass'],
	bioenergy_biogas: ['bioenergy_biogas'],
	bioenergy: ['bioenergy'],

	distillate: ['distillate'],

	hydro: ['hydro'],

	storage_discharging: [
		'battery',
		'battery_discharging',
		'battery_VPP_discharging',
		'battery_distributed_discharging'
	],

	wind: ['wind'],
	wind_offshore: ['wind_offshore'],
	// solar_thermal: ['solar_thermal'],
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

	coal_brown: 'Coal (Brown)',
	coal_black: 'Coal (Black)',

	distillate: 'Distillate',

	gas_ccgt: 'Gas (CCGT)',
	gas_ccgt_ccs: 'Gas (CCGT CCS)',
	gas_ocgt: 'Gas (OCGT)',
	gas_recip: 'Gas (Reciprocating)',
	gas_steam: 'Gas (Steam)',
	gas_wcmg: 'Gas (Waste Coal Mine)',
	// gas_hydrogen: 'Gas (Hydrogen)',

	bioenergy_biogas: 'Bioenergy (Biogas)',
	bioenergy_biomass: 'Bioenergy (Biomass)',
	bioenergy: 'Bioenergy',

	hydro: 'Hydro',

	wind: 'Wind',
	wind_offshore: 'Wind (Offshore)',

	solar_utility: 'Solar (Utility)',
	solar_rooftop: 'Solar (Rooftop)'
};

/** @type {FuelTechCode[]} */
const order = [
	'storage_charging',

	'exports',

	'demand_response',
	'imports',

	'coal_brown',
	'coal_black',

	'bioenergy',
	'bioenergy_biogas',
	'bioenergy_biomass',

	'distillate',

	'gas_steam',
	'gas_ccgt',
	'gas_ccgt_ccs',
	'gas_ocgt',
	'gas_recip',
	'gas_wcmg',
	'gas_hydrogen',

	'storage_discharging',

	'hydro',

	'wind',
	'wind_offshore',

	'solar_utility',
	'solar_rooftop'
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
	label: 'Detailed',
	value: 'detailed',
	fuelTechs: fuelTechMap,
	order: order,
	labels: labels,
	fuelTechNameReducer
});
