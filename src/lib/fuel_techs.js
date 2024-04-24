import { getKeys } from '$lib/utils/keys';

/** @type {Object.<FuelTechCode, string>}} */
export const fuelTechNameMap = {
	battery_charging: 'Battery (Charging)',
	battery_VPP_charging: 'Battery (VPP Charging)',
	battery_distributed_charging: 'Battery (Distributed Charging)',

	demand_response: 'Demand Response',
	exports: 'Exports',

	interconnector: 'Interconnector',
	imports: 'Imports',

	battery: 'Battery',
	battery_discharging: 'Battery (Discharging)',
	battery_VPP_discharging: 'Battery (VPP Discharging)',
	battery_distributed_discharging: 'Battery (Distributed Discharging)',

	coal_brown: 'Coal (Brown)',
	coal_black: 'Coal (Black)',
	coal: 'Coal',

	nuclear: 'Nuclear',

	distillate: 'Distillate',

	gas_ccgt: 'Gas (CCGT)',
	gas_ccgt_ccs: 'Gas (CCGT CCS)',
	gas_ocgt: 'Gas (OCGT)',
	gas_recip: 'Gas (Reciprocating)',
	gas_steam: 'Gas (Steam)',
	gas_wcmg: 'Gas (Waste Coal Mine)',
	gas_hydrogen: 'Gas (Hydrogen)',
	gas: 'Gas',

	bioenergy_biogas: 'Bioenergy (Bio gas)',
	bioenergy_biomass: 'Bioenergy (Bio mass)',
	bioenergy: 'Bioenergy',

	hydro: 'Hydro',
	pumps: 'Pumps',

	wind: 'Wind',
	wind_offshore: 'Wind (Offshore)',

	solar_utility: 'Solar (Utility)',
	solar_thermal: 'Solar (Thermal)',
	solar_rooftop: 'Solar (Rooftop)',
	solar: 'Solar',

	fossil_fuels: 'Fossil Fuels',
	renewables: 'Renewables'
};

export const fuelTechOrder = [
	'battery_charging',
	'pumps',
	'exports',
	'imports',
	'coal_brown',
	'coal_black',
	'bioenergy_biogas',
	'bioenergy_biomass',
	'distillate',
	'gas_steam',
	'gas_ccgt',
	'gas_ocgt',
	'gas_recip',
	'gas_wcmg',
	'battery_discharging',
	'hydro',
	'wind',
	'solar_utility',
	'solar_rooftop'
];

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
export const fuelTechGroupMap = {
	// battery_charging: ['battery_charging', 'battery_VPP_charging', 'battery_distributed_charging'],
	// demand_response: ['demand_response'],
	// exports: ['exports'],

	// imports: ['imports'],

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

	// battery: ['battery_discharging', 'battery_VPP_discharging', 'battery_distributed_discharging'],

	wind: ['wind', 'wind_offshore'],

	solar: ['solar_utility', 'solar_thermal', 'solar_rooftop']
};

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
export const historicalEnergyGroupMap = {
	// battery_charging: ['battery_charging', 'battery_VPP_charging', 'battery_distributed_charging'],
	// demand_response: ['demand_response'],
	// exports: ['exports'],

	// imports: ['imports'],

	coal: ['coal_black', 'coal_brown'],

	gas: ['gas_ccgt', 'gas_ocgt', 'gas_recip', 'gas_steam', 'gas_wcmg'],

	hydro: ['hydro'],

	// battery: ['battery_discharging'],

	wind: ['wind'],

	solar: ['solar_utility', 'solar_rooftop']
};

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
export const fossilRenewablesGroupMap = {
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
	// battery: ['battery_discharging']
};

/** @type {Object.<FuelTechCode, string>}} */
export const fuelTechColourMap = {
	battery_charging: '#4F5FD7',
	battery_discharging: '#3145CE',
	battery_VPP_charging: '#4F5FD7',
	battery_VPP_discharging: '#3145CE',
	battery_distributed_charging: '#4F5FD7',
	battery_distributed_discharging: '#3145CE',
	battery: '#3145CE',

	bioenergy: '#069FAF',
	bioenergy_biogas: '#069FAF',
	bioenergy_biomass: '#0B757C',

	coal: '#251C00',
	coal_black: '#251C00',
	coal_brown: '#675B42',

	distillate: '#E46E56',

	gas: '#E78114',
	gas_ccgt: '#ED9C2C',
	gas_ccgt_ccs: '#F1AB4B',
	gas_ocgt: '#F0AC4A',
	gas_recip: '#F4C379',
	gas_steam: '#E78114',
	gas_wcmg: '#DA630E',
	gas_hydrogen: '#C75338',

	hydro: '#ACE9FE', // 00A5F1
	pumps: '#00A5F1', // ACE9FE

	solar: '#FECE00',
	solar_utility: '#FECE00',
	solar_thermal: '#FDB200',
	solar_rooftop: '#FFEB5C',

	wind: '#2A7E3F',
	wind_offshore: '#53AD69', // 2A7E3F

	nuclear: '#C75338',

	imports: '#CFA7FF',
	exports: '#722AF7',
	interconnector: '#7F7F7F',
	demand_response: '#7F7F7F',

	fossil_fuels: '#594929',
	renewables: '#52A972',
	fossil: '#594929',
	renewable: '#52A972'
};

export const fuelTechGroups = /** @type {FuelTechCode[]} */ (getKeys(fuelTechGroupMap));
export const fuelTechNames = getKeys(fuelTechNameMap);

export const historicalEnergyGroups = /** @type {FuelTechCode[]} */ (
	getKeys(historicalEnergyGroupMap)
);

export const fossilRenewablesGroups = /** @type {FuelTechCode[]} */ (
	getKeys(fossilRenewablesGroupMap)
);

/**
 * @param {Object.<FuelTechCode, FuelTechCode[]>} groupMap
 * @param {FuelTechCode} groupCode
 * @returns {FuelTechCode[]}
 */
export const fuelTechGroup = (groupMap, groupCode) => {
	if (groupMap[groupCode]) return groupMap[groupCode];
	return [groupCode];
};

/**
 * @param {FuelTechCode} ftCode
 * @returns {string}
 */
export const fuelTechName = (ftCode) => fuelTechNameMap[ftCode] || ftCode;

/**
 * @param {FuelTechCode} ftCode
 * @returns {string}
 */
export const fuelTechColour = (ftCode) => fuelTechColourMap[ftCode] || '#fff';
