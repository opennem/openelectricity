/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
export const fuelTechMap = {
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
		'distillate',
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
		'bioenergy_biogas',
		'hydro',
		'wind',
		'wind_offshore',
		'solar_utility',
		'solar_rooftop',
		'solar_thermal'
	]
};

/** @type {Object.<FuelTechCode, string>}} */
export const labels = {
	battery_charging: 'Battery (Charging)',
	battery_discharging: 'Battery (Discharging)',
	demand_response: 'Demand Response',
	exports: 'Exports',
	imports: 'Imports',
	fossil: 'Fossil Fuels',
	renewable: 'Renewables'
};

/** @type {FuelTechCode[]} */
export const order = [
	'battery_charging',
	'exports',
	'demand_response',
	'imports',
	'fossil',
	'battery_discharging',
	'renewable'
];
