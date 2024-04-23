/** @type {Object.<FuelTechCode, string>}} */
const fuelTechColourMap = {
	battery_charging: '#B2DAEF',
	battery_discharging: '#00A2FA',
	battery_VPP_charging: '#B2DAEF',
	battery_VPP_discharging: '#00A2FA',
	battery_distributed_charging: '#B2DAEF',
	battery_distributed_discharging: '#00A2FA',
	battery: '#00A2FA',

	bioenergy: '#A3886F',
	bioenergy_biogas: '#4CB9B9',
	bioenergy_biomass: '#1D7A7A',

	coal: '#131313',
	coal_black: '#121212',
	coal_brown: '#8B572A',

	distillate: '#F35020',

	gas: '#FF8813',
	gas_ccgt: '#FDB462',
	gas_ccgt_ccs: '#DD8018',
	gas_ocgt: '#FFCD96',
	gas_recip: '#F9DCBC',
	gas_steam: '#F48E1B',
	gas_lfg: '#DD8018',
	gas_wcmg: '#B46813',
	gas_hydrogen: '#FF8813',

	hydro: '#4582B4',
	pumps: '#88AFD0',

	solar: '#FED500',
	solar_thermal: '#FDB200',
	solar_utility: '#FED500',
	solar_rooftop: '#FFE03D',

	wind: '#417505',
	wind_offshore: '#53AD69',

	nuclear: '#C75338',

	imports: '#44146F',
	exports: '#977AB1',
	interconnector: '#7F7F7F',
	demand_response: '#7F7F7F',

	fossil_fuels: '#444444',
	renewables: '#52BCA3'
};

const carbonIntensityColourMap = {
	0: '#2D9B14',
	100: '#ffe310',
	550: '#803D11',
	1000: '#000000'
};

export { fuelTechColourMap, carbonIntensityColourMap };
