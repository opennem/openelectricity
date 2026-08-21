/**
 * Network fuel-tech grouping for variable renewables and residual sources.
 *
 * This is deliberately separate from the Lens grouping of the same name:
 * network responses contain detailed leaf fuel-tech codes, while Lens data is
 * already rolled up to broad categories such as `coal`, `gas` and `solar`.
 */

/** @type {Object.<FuelTechCode, FuelTechCode[]>} */
const fuelTechMap = {
	imports: ['imports'],
	vre: ['wind', 'wind_offshore', 'solar_utility', 'solar_rooftop'],
	residual: [
		'demand_response',
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
		'battery',
		'battery_discharging',
		'battery_VPP_discharging',
		'battery_distributed_discharging',
		'hydro'
	]
};

/** @type {Object.<FuelTechCode, string>} */
const labels = {
	imports: 'Imports',
	vre: 'VRE',
	residual: 'Residual'
};

/** @type {FuelTechCode[]} */
const order = ['imports', 'vre', 'residual'];

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
	label: 'VRE/Residual',
	value: 'vre-residual',
	fuelTechs: fuelTechMap,
	order,
	labels,
	fuelTechNameReducer
});
