/**
 * Defining fuel tech grouping
 * - fuelTechMap: mapping of fuel techs to groups
 * - order: order of groups
 * - labels: labels for groups
 */

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const fuelTechMap = {
	import: ['import'],
	vre: ['wind', 'solar'],
	residual: ['bioenergy', 'hydro', 'coal', 'gas', 'oil', 'nuclear']
};

/** @type {Object.<FuelTechCode, string>}} */
const labels = {
	import: 'Import',
	vre: 'VRE',
	residual: 'Residual'
};

/** @type {FuelTechCode[]} */
const order = ['import', 'vre', 'residual'];

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
	label: 'VRE/Residual',
	value: 'vre-residual',
	fuelTechs: fuelTechMap,
	order,
	labels,
	fuelTechNameReducer
});
