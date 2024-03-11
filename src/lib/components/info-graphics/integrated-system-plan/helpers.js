import { format as d3Format } from 'd3-format';
import { formatInTimeZone } from 'date-fns-tz';
import { subYears } from 'date-fns';

import { fuelTechName, fuelTechColour } from '$lib/fuel_techs.js';

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
export const domainGroups = {
	battery_charging: ['battery_charging', 'battery_VPP_charging', 'battery_distributed_charging'],
	demand_response: ['demand_response'],

	coal: ['coal_black', 'coal_brown'],
	gas: [
		'gas_ccgt',
		'gas_ccgt_ccs',
		'gas_ocgt',
		'gas_recip',
		'gas_steam',
		'gas_wcmg',
		'gas_hydrogen'
	],
	hydro: ['hydro'],

	battery: ['battery_discharging', 'battery_VPP_discharging', 'battery_distributed_discharging'],

	wind: ['wind', 'wind_offshore'],
	solar: ['solar_utility', 'solar_thermal', 'solar_rooftop']
};

export const domainOrder = [
	// 'battery_charging',
	// 'demand_response',

	'coal',
	'gas',
	'hydro',

	// 'battery',

	'wind',
	'solar'
];

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

export const formatTickX = (/** @type {Date | number} */ d) =>
	'FY' + formatInTimeZone(d, '+10:00', 'yy');

// minus 1 year to display as FY
export const formatFyTickX = (/** @type {Date | number} */ d) =>
	'FY' + formatInTimeZone(subYears(d, 1), '+10:00', 'yy');

export const formatTickY = (/** @type {number} */ d) => d3Format('~s')(d);

export const formatValue = (/** @type {number} */ d) => {
	const formatted = d3Format('.0f')(d);
	if (formatted !== '0') {
		return formatted + ' TWh';
	}
	return formatted;
};
