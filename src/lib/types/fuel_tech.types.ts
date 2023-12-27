export type FuelTechCode =
	| 'battery_charging'
	| 'battery_discharging'
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
	| 'hydro'
	| 'pumps'
	| 'solar_utility'
	| 'solar_thermal'
	| 'solar_rooftop'
	| 'wind'
	| 'nuclear'
	| 'imports'
	| 'exports'
	| 'interconnector'
	| 'bioenergy'
	| 'coal'
	| 'gas'
	| 'solar';

export type FuelTech = {
	_id: string;
	code: FuelTechCode;
	colour: string;
	name: string;
	renewable: boolean;
};
