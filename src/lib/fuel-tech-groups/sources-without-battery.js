/**
 * Defining fuel tech grouping
 * - fuelTechMap: mapping of fuel techs to groups
 * - order: order of groups
 * - labels: labels for groups
 */

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const fuelTechMap = {
	total_sources: [
		'demand_response',

		'imports',

		'coal_black',
		'coal_brown',

		'bioenergy',
		'bioenergy_biomass',
		'bioenergy_biogas',

		'distillate',

		'gas_steam',
		'gas_ccgt',
		'gas_ccgt_ccs',
		'gas_ocgt',
		'gas_recip',
		'gas_wcmg',
		'gas_hydrogen',

		'hydro',

		'wind',
		'wind_offshore',

		'solar_utility',
		'solar_rooftop'
	]
};

/** @type {Object.<FuelTechCode, string>}} */
const labels = {
	total_sources: 'All Sources'
};

/** @type {FuelTechCode[]} */
export const order = ['total_sources'];

/** @type {FuelTechGroup} */
export default Object.freeze({
	label: 'Sources without Battery',
	value: 'sources_without_battery',
	fuelTechs: fuelTechMap,
	order: order,
	labels: labels
});
