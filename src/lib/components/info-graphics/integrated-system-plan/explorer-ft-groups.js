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

const defaultOrder = [
	'battery_charging',
	'exports',

	'demand_response',
	'battery_discharging',
	'imports',

	'coal',
	'gas',
	'bioenergy',
	'hydro',

	'wind',
	'solar_utility',
	'solar_rooftop'
];
/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const defaultGroup = {
	battery_charging: ['battery_charging', 'battery_VPP_charging', 'battery_distributed_charging'],
	demand_response: ['demand_response'],
	exports: ['exports'],

	imports: ['imports'],
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
	bioenergy: ['bioenergy_biomass'],
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

const detailedOrder = [
	'battery_charging',
	'battery_VPP_charging',
	'battery_distributed_charging',

	'exports',

	'demand_response',
	'battery_discharging',
	'battery_VPP_discharging',
	'battery_distributed_discharging',
	'imports',

	'coal_black',
	'coal_brown',

	'gas_ccgt',
	'gas_ccgt_ccs',
	'gas_ocgt',
	'gas_recip',
	'gas_steam',
	'gas_wcmg',
	'gas_hydrogen',
	'bioenergy_biomass',
	'hydro',

	'wind',
	'wind_offshore',
	'solar_utility',
	'solar_rooftop'
];
/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const detailedGroup = {
	battery_charging: ['battery_charging'],
	battery_VPP_charging: ['battery_VPP_charging'],
	battery_distributed_charging: ['battery_distributed_charging'],

	demand_response: ['demand_response'],
	exports: ['exports'],

	imports: ['imports'],

	coal_black: ['coal_black'],
	coal_brown: ['coal_brown'],

	gas_ccgt: ['gas_ccgt'],
	gas_ccgt_ccs: ['gas_ccgt_ccs'],
	gas_ocgt: ['gas_ocgt'],
	gas_recip: ['gas_recip'],
	gas_steam: ['gas_steam'],
	gas_wcmg: ['gas_wcmg'],
	gas_hydrogen: ['gas_hydrogen'],
	bioenergy_biomass: ['bioenergy_biomass'],
	hydro: ['hydro'],

	battery_discharging: ['battery_discharging'],
	battery_VPP_discharging: ['battery_VPP_discharging'],
	battery_distributed_discharging: ['battery_distributed_discharging'],

	wind: ['wind'],
	wind_offshore: ['wind_offshore'],
	solar_utility: ['solar_utility'],
	solar_rooftop: ['solar_rooftop']
};

const renewablesVsFtOrder = [
	'battery_charging',
	'exports',
	'demand_response',
	'battery_discharging',

	'imports',
	'fossil',
	'renewable'
];
/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const renewablesVsFtGroup = {
	battery_charging: ['battery_charging', 'battery_VPP_charging', 'battery_distributed_charging'],
	battery_discharging: [
		'battery_discharging',
		'battery_VPP_discharging',
		'battery_distributed_discharging'
	],

	demand_response: ['demand_response'],
	exports: ['exports'],
	imports: ['imports'],
	fossil: [
		'coal_black',
		'coal_brown',
		'gas_ccgt',
		'gas_ccgt_ccs',
		'gas_ocgt',
		'gas_recip',
		'gas_steam',
		'gas_wcmg',
		'gas_hydrogen'
	],
	renewable: [
		'bioenergy_biomass',
		'hydro',
		'wind',
		'wind_offshore',
		'solar_utility',
		'solar_rooftop',
		'solar_thermal'
	]
};

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
