/**
 * Fueltech classification lists shared by the renewables methodology.
 *
 * A leaf module so client code (e.g. the tracker's network metrics) can sum
 * fossil/renewable fueltechs without dragging `calculate-renewables.js` — and
 * its Statistic/TimeSeries dependencies — into the bundle.
 *
 * These lists back the homepage renewables-vs-fossil calculation: the fossil
 * share is a real sum over `FOSSIL_FUEL_TECHS` (never `demand − renewables`).
 */

/** @type {FuelTechCode[]} */
export const FOSSIL_FUEL_TECHS = [
	'coal_black',
	'coal_brown',
	'gas_ccgt',
	'gas_ocgt',
	'gas_recip',
	'gas_steam',
	'gas_wcmg',
	'distillate'
];

/** @type {FuelTechCode[]} */
export const RENEWABLE_FUEL_TECHS = [
	'solar_utility',
	'solar_rooftop',
	'wind',
	'hydro',
	'bioenergy_biogas',
	'bioenergy_biomass'
];

/** @type {FuelTechCode[]} */
export const LOAD_FUEL_TECHS = ['exports', 'battery_charging', 'pumps'];
