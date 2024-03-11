import { range } from 'd3-array';
import { format as d3Format } from 'd3-format';
import { formatInTimeZone } from 'date-fns-tz';
import { fuelTechName, fuelTechColour } from '$lib/fuel_techs.js';

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
export const domainGroups = {
	fossil_fuels: [
		'coal_black',
		'coal_brown',
		'gas_ccgt',
		'gas_ocgt',
		'gas_recip',
		'gas_steam',
		'gas_wcmg',
		'distillate'
	],
	renewables: [
		'solar_utility',
		'solar_rooftop',
		'wind',
		'hydro',
		'bioenergy_biogas',
		'bioenergy_biomass'
	]
};
/** @type {FuelTechCode[]} */
export const loadFts = ['exports', 'battery_charging', 'pumps'];

export const totalId = 'au-total';

export const labelReducer = (
	/** @type {Object.<string, string>} */ acc,
	/** @type {StatsData} **/ d
) => {
	acc[d.id] = d.fuel_tech ? fuelTechName(d.fuel_tech) : '';
	return acc;
};
export const colourReducer = (
	/** @type {Object.<string, string>} */ acc,
	/** @type {StatsData} **/ d
) => {
	acc[d.id] = d.fuel_tech ? fuelTechColour(d.fuel_tech) : '';
	return acc;
};

export const formatTickX = (/** @type {Date} */ d) => formatInTimeZone(d, '+10:00', 'yyyy');
export const formatTickY = (/** @type {number} */ d) => `${d3Format('~s')(d)}%`;

const years = getYears();
export const xDomain = [
	new Date(years[0], 0, 1).getTime(),
	new Date(years[years.length - 1], 0, 1).getTime()
];
export const displayXTicks = years.map((year) => new Date(`${year}-01-01`));

/**
 * return an array of years from 2000 to 10 years in the future so the chart has a consistent x-axis
 */
function getYears() {
	const today = new Date();
	return range(2000, today.getFullYear() + 10, 5);
}
