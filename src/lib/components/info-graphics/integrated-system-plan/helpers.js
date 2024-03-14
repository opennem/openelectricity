import { format as d3Format } from 'd3-format';
import { formatInTimeZone } from 'date-fns-tz';
import { subYears, addYears, startOfYear, format } from 'date-fns';

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
	solar_utility: ['solar_utility'],
	solar_rooftop: ['solar_rooftop']
};

export const domainOrder = [
	// 'battery_charging',
	// 'demand_response',

	'coal',
	'gas',
	'hydro',

	// 'battery',

	'wind',
	'solar_utility',
	'solar_rooftop'
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

export const formatTickX = (/** @type {Date | number} */ d) => {
	return format(subYears(d, 1), 'yyyy') + '-' + format(d, 'yy');
};

export const formatFyTickX = (/** @type {Date | number} */ d) => 'FY' + format(d, 'yy');

export const formatTickY = (/** @type {number} */ d) => d3Format('~s')(d);

export const formatValue = (/** @type {number} */ d) => {
	const formatted = d3Format('.0f')(d);
	if (formatted !== '0') {
		return formatted + ' TWh';
	}
	return formatted;
};

export const displayXTicks = (d) => d.map((t) => startOfYear(t));

/** @type {ScenarioKey[]} */
export const scenarios = ['step_change', 'progressive_change', 'green_energy_exports']; // scenarios in display order

/** @type {Object.<ScenarioKey, string>} */
export const scenarioLabels = {
	step_change: 'Step Change',
	progressive_change: 'Progressive Change',
	// slow_change: 'Slow Change',
	green_energy_exports: 'Green Energy Exports'
	// hydrogen_superpower: 'Hydrogen Superpower'
};

/** @type {Object.<ScenarioKey, string>} */
export const scenarioDescriptions = {
	step_change:
		'The Step Change scenario is considered the most likely future for the National Electricity Market (NEM). This scenario takes into account various factors such as ageing generation plants, technical innovation, economics, government policies, energy security, and consumer choice.',
	progressive_change:
		'The Progressive Change scenario is designed to assess the potential impact of a gradual and evolving transition toward a low-carbon energy system, taking into account the complexities and challenges associated with achieving decarbonization goals.',
	slow_change:
		'The Slow Change scenario is an unlikely transition scenario that does not meet carbon reduction targets. It takes into account the difficult economic environment following the COVID-19 pandemic, reflecting a slower economy and falling short of the targets.',
	green_energy_exports:
		'The Green Energy Exports scenario is a highly ambitious scenario that includes strong global action, significant technological breakthroughs, and a near quadrupling of National Electricity Market (NEM) energy consumption to support a hydrogen export industry. '
};

export const selectedPathway = 'CDP11 (ODP)';
