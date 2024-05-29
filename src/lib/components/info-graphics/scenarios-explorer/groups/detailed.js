/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
export const fuelTechMap = {
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
	solar_thermal: ['solar_thermal'],
	solar_utility: ['solar_utility'],
	solar_rooftop: ['solar_rooftop']
};

/** @type {FuelTechCode[]} */
export const order = [
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
	'solar_thermal',
	'solar_utility',
	'solar_rooftop'
];
