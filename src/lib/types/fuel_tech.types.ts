export type FuelTechCode =
	| 'battery_charging'
	| 'battery_discharging'
	| 'battery_VPP_charging'
	| 'battery_VPP_discharging'
	| 'battery_distributed_charging'
	| 'battery_distributed_discharging'
	| 'bioenergy_biogas'
	| 'bioenergy_biomass'
	| 'coal_black'
	| 'coal_brown'
	| 'distillate'
	| 'gas_ccgt'
	| 'gas_ocgt'
	| 'gas_recip'
	| 'gas_steam'
	| 'gas_wcmg'
	| 'gas_hydrogen'
	| 'hydro'
	| 'pumps'
	| 'solar_utility'
	| 'solar_thermal'
	| 'solar_rooftop'
	| 'wind'
	| 'wind_offshore'
	| 'nuclear'
	| 'imports'
	| 'exports'
	| 'interconnector'
	| 'demand_response'
	| 'bioenergy'
	| 'coal'
	| 'gas'
	| 'solar'
	| 'fossil_fuels'
	| 'renewables'
	| 'fossil'
	| 'renewable';

export type FuelTech = {
	_id: string;
	code: FuelTechCode;
	colour: string;
	name: string;
	renewable: boolean;
};
