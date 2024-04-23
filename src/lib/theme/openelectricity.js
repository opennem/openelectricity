/** @type {Object.<FuelTechCode, string>}} */
const fuelTechColourMap = {
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

	hydro: '#ACE9FE',
	pumps: '#00A5F1',

	solar: '#FECE00',
	solar_utility: '#FECE00',
	solar_thermal: '#FDB200',
	solar_rooftop: '#FFEB5C',

	wind: '#2A7E3F',
	wind_offshore: '#53AD69',

	nuclear: '#C75338',

	imports: '#CFA7FF',
	exports: '#722AF7',
	interconnector: '#7F7F7F',
	demand_response: '#7F7F7F',

	fossil_fuels: '#594929',
	renewables: '#52A972'
};

const carbonIntensityColourMap = {
	0: '#21956C',
	100: '#8BB97A',
	200: '#E9FFAA',
	800: '#3F2E16'
};

export { fuelTechColourMap, carbonIntensityColourMap };
