/** @type {Object.<FuelTechCode, string>}} */
const fuelTechColourMap = {
	battery_charging: '#577CFF',
	battery_discharging: '#3245c9',
	battery_VPP_charging: '#577CFF',
	battery_VPP_discharging: '#3245c9',
	battery_distributed_charging: '#577CFF',
	battery_distributed_discharging: '#3245c9',
	battery: '#3245c9',

	bioenergy: '#1D7A7A',
	bioenergy_biogas: '#4CB9B9',
	bioenergy_biomass: '#1D7A7A',

	coal: '#25170C',
	coal_black: '#121212',
	coal_brown: '#744A26',

	distillate: '#E15C34',

	gas: '#E87809',
	gas_ccgt: '#FDB462',
	gas_ccgt_ccs: '#F1AB4B',
	gas_ocgt: '#FFCD96',
	gas_recip: '#F9DCBC',
	gas_steam: '#F48E1B',
	gas_wcmg: '#B46813',
	gas_hydrogen: '#C75338',

	hydro: '#5EA0C0',
	pumps: '#88AFD0',

	solar: '#FED500',
	solar_utility: '#FED500',
	solar_thermal: '#FDB200',
	solar_rooftop: '#FFF58D',

	wind: '#2C7629',
	wind_offshore: '#53AD69',

	nuclear: '#C75338',

	imports: '#521986',
	exports: '#927BAD',
	interconnector: '#7F7F7F',
	demand_response: '#7F7F7F',

	fossil_fuels: '#594929',
	renewables: '#52A972',
	fossil: '#594929',
	renewable: '#52A972',

	total_loads: '#CFA7FF',
	total_sources: '#251C00'
};

const carbonIntensityColourMap = {
	0: '#21956C',
	100: '#8BB97A',
	200: '#E9FFAA',
	800: '#3F2E16'
};

export { fuelTechColourMap, carbonIntensityColourMap };
