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
	bioenergy_biogas: ['bioenergy_biogas'],
	distillate: ['distillate'],

	hydro: ['hydro'],
	pumps: ['pumps'],

	battery_discharging: ['battery_discharging'],
	battery_VPP_discharging: ['battery_VPP_discharging'],
	battery_distributed_discharging: ['battery_distributed_discharging'],

	wind: ['wind'],
	wind_offshore: ['wind_offshore'],
	solar_thermal: ['solar_thermal'],
	solar_utility: ['solar_utility'],
	solar_rooftop: ['solar_rooftop']
};

/** @type {Object.<FuelTechCode, string>}} */
export const labels = {
	battery_charging: 'Battery (Charging)',
	battery_VPP_charging: 'Battery (VPP Charging)',
	battery_distributed_charging: 'Battery (Distributed Charging)',

	demand_response: 'Demand Response',
	exports: 'Exports',

	imports: 'Imports',

	battery_discharging: 'Battery (Discharging)',
	battery_VPP_discharging: 'Battery (VPP Discharging)',
	battery_distributed_discharging: 'Battery (Distributed Discharging)',

	coal_brown: 'Coal (Brown)',
	coal_black: 'Coal (Black)',

	distillate: 'Distillate',

	gas_ccgt: 'Gas (CCGT)',
	gas_ccgt_ccs: 'Gas (CCGT CCS)',
	gas_ocgt: 'Gas (OCGT)',
	gas_recip: 'Gas (Reciprocating)',
	gas_steam: 'Gas (Steam)',
	gas_wcmg: 'Gas (Waste Coal Mine)',
	gas_hydrogen: 'Gas (Hydrogen)',

	bioenergy_biogas: 'Bioenergy (Bio gas)',
	bioenergy_biomass: 'Bioenergy (Bio mass)',

	hydro: 'Hydro',
	pumps: 'Pumps',

	wind: 'Wind',
	wind_offshore: 'Wind (Offshore)',

	solar_utility: 'Solar (Utility)',
	solar_thermal: 'Solar (Thermal)',
	solar_rooftop: 'Solar (Rooftop)'
};

/** @type {FuelTechCode[]} */
export const order = [
	'battery_charging',
	'battery_VPP_charging',
	'battery_distributed_charging',

	'pumps',

	'exports',

	'demand_response',
	'imports',

	'coal_black',
	'coal_brown',

	'bioenergy_biomass',
	'bioenergy_biogas',

	'gas_ccgt',
	'gas_ccgt_ccs',
	'gas_ocgt',
	'gas_recip',
	'gas_steam',
	'gas_wcmg',
	'gas_hydrogen',

	'battery_discharging',
	'battery_VPP_discharging',
	'battery_distributed_discharging',

	'hydro',

	'wind',
	'wind_offshore',

	'solar_thermal',
	'solar_utility',
	'solar_rooftop'
];
