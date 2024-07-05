/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
export const fuelTechMap = {
	total_loads: [
		'battery_charging',
		'battery_VPP_charging',
		'battery_distributed_charging',
		'pumps',
		'exports',
		'demand_response'
	],
	total_sources: [
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
		'bioenergy',
		'bioenergy_biomass',
		'bioenergy_biogas',
		'hydro',
		'wind',
		'wind_offshore',
		'solar_utility',
		'solar_rooftop'
	]
};

/** @type {Object.<FuelTechCode, string>}} */
export const labels = {
	total_loads: 'All Loads',
	total_sources: 'All Sources'
};

/** @type {FuelTechCode[]} */
export const order = ['total_loads', 'total_sources'];
