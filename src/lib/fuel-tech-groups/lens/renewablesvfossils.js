/**
 * Defining fuel tech grouping
 * - fuelTechMap: mapping of fuel techs to groups
 * - order: order of groups
 * - labels: labels for groups
 */

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const fuelTechMap = {
	import: ['import'],
	fossil: ['coal', 'gas', 'oil'],
	renewable: ['bioenergy', 'hydro', 'wind', 'solar'],
	nuclear: ['nuclear']
};

/** @type {Object.<FuelTechCode, string>}} */
const labels = {
	import: 'Import',
	fossil: 'Fossils',
	renewable: 'Renewables',
	nuclear: 'Nuclear'
};

/** @type {FuelTechCode[]} */
const order = ['import', 'fossil', 'nuclear', 'renewable'];

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
	label: 'Renewables vs Fossils',
	value: 'rvf',
	fuelTechs: fuelTechMap,
	order,
	labels,
	fuelTechNameReducer
});
