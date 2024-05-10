export const groups = [
	{
		label: 'Default',
		value: 'default'
	},
	{
		label: 'Renewables vs Fossil Fuels',
		value: 'renewables_vs_fossil_fuels'
	}
];

export const explorerGroups = [
	{
		label: 'Detailed',
		value: 'detailed'
	},
	{
		label: 'Default',
		value: 'default'
	},
	{
		label: 'Renewables vs Fossil Fuels',
		value: 'renewables_vs_fossil_fuels'
	}
];

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const defaultGroup = {
	battery_charging: ['battery_charging', 'battery_VPP_charging', 'battery_distributed_charging'],
	demand_response: ['demand_response'],

	coal: ['coal_black', 'coal_brown'],
	gas: [
		'gas_ccgt',
		// 'gas_ccgt_ccs',
		'gas_ocgt',
		'gas_recip',
		'gas_steam',
		'gas_wcmg',
		'gas_hydrogen'
	],
	hydro: ['hydro'],

	battery_discharging: [
		'battery_discharging',
		'battery_VPP_discharging',
		'battery_distributed_discharging'
	],

	wind: ['wind', 'wind_offshore'],
	solar_utility: ['solar_utility'],
	solar_rooftop: ['solar_rooftop']
};

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const detailedGroup = {
	battery_charging: ['battery_charging'],
	battery_VPP_charging: ['battery_VPP_charging'],
	battery_distributed_charging: ['battery_distributed_charging'],

	demand_response: ['demand_response'],

	coal_black: ['coal_black'],
	coal_brown: ['coal_brown'],

	gas_ccgt: ['gas_ccgt'],
	gas_ccgt_ccs: ['gas_ccgt_ccs'],
	gas_ocgt: ['gas_ocgt'],
	gas_recip: ['gas_recip'],
	gas_steam: ['gas_steam'],
	gas_wcmg: ['gas_wcmg'],
	gas_hydrogen: ['gas_hydrogen'],
	hydro: ['hydro'],

	battery_discharging: ['battery_discharging'],
	battery_VPP_discharging: ['battery_VPP_discharging'],
	battery_distributed_discharging: ['battery_distributed_discharging'],

	wind: ['wind'],
	wind_offshore: ['wind_offshore'],
	solar_utility: ['solar_utility'],
	solar_rooftop: ['solar_rooftop']
};

const detailedOrder = [
	'battery_charging',
	'battery_VPP_charging',
	'battery_distributed_charging',

	'demand_response',

	'coal_black',
	'coal_brown',

	'gas_ccgt',
	'gas_ccgt_ccs',
	'gas_ocgt',
	'gas_recip',
	'gas_steam',
	'gas_wcmg',
	'gas_hydrogen',
	'hydro',

	'battery_discharging',
	'battery_VPP_discharging',
	'battery_distributed_discharging',

	'wind',
	'wind_offshore',
	'solar_utility',
	'solar_rooftop'
];

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const renewablesVsFtGroup = {
	battery_charging: ['battery_charging', 'battery_VPP_charging', 'battery_distributed_charging'],
	demand_response: ['demand_response'],
	fossil: [
		'coal_black',
		'coal_brown',
		'gas_ccgt',
		'gas_ccgt_ccs',
		'gas_ocgt',
		'gas_recip',
		'gas_steam',
		'gas_wcmg',
		'gas_hydrogen',
		'distillate'
	],
	battery_discharging: [
		'battery_discharging',
		'battery_VPP_discharging',
		'battery_distributed_discharging'
	],
	renewable: [
		'bioenergy_biomass',
		'bioenergy_biogas',
		'hydro',
		'wind',
		'wind_offshore',
		'solar_utility',
		'solar_rooftop',
		'solar_thermal'
	]
};

const defaultOrder = [
	'battery_charging',
	'demand_response',

	'coal',
	'gas',
	'hydro',

	'battery_discharging',

	'wind',
	'solar_utility',
	'solar_rooftop'
];
const renewablesVsFtOrder = [
	'battery_charging',
	'demand_response',
	'battery_discharging',
	'fossil',
	'renewable'
];

export const groupMap = {
	default: defaultGroup,
	renewables_vs_fossil_fuels: renewablesVsFtGroup,
	detailed: detailedGroup
};
export const orderMap = {
	default: defaultOrder,
	renewables_vs_fossil_fuels: renewablesVsFtOrder,
	detailed: detailedOrder
};
