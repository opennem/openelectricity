/**
 * Defining fuel tech grouping
 * - fuelTechMap: mapping of fuel techs to groups
 * - order: order of groups
 * - labels: labels for groups
 */

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const fuelTechMap = {
	import: ['import'],
	coal: ['coal'],
	gas: ['gas'],
	bioenergy: ['bioenergy'],
	oil: ['oil'],
	hydro: ['hydro'],
	wind: ['wind'],
	nuclear: ['nuclear'],
	solar: ['solar']
};

/** @type {Object.<FuelTechCode, string>}} */
const labels = {
	import: 'Import',
	coal: 'Coal',
	gas: 'Gas',
	bioenergy: 'Bioenergy',
	oil: 'Oil',
	hydro: 'Hydro',
	wind: 'Wind',
	nuclear: 'Nuclear',
	solar: 'Solar'
};

/** @type {FuelTechCode[]} */
const order = ['import', 'coal', 'nuclear', 'bioenergy', 'oil', 'gas', 'hydro', 'wind', 'solar'];

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
	order,
	labels,
	fuelTechNameReducer
});
