export const fuelTechNameMap = {
	battery_charging: 'Battery (Charging)',
	battery_discharging: 'Battery (Discharging)',
	bioenergy_biogas: 'Bioenergy (Bio gas)',
	bioenergy_biomass: 'Bioenergy (Bio mass)',
	coal_black: 'Coal (Black)',
	coal_brown: 'Coal (Brown)',
	distillate: 'Distillate',
	gas_ccgt: 'Gas (CCGT)',
	gas_ocgt: 'Gas (OCGT)',
	gas_recip: 'Gas (Reciprocating)',
	gas_steam: 'Gas (Steam)',
	gas_wcmg: 'Gas (Waste Coal Mine)',
	hydro: 'Hydro',
	pumps: 'Pumps',
	solar_utility: 'Solar (Utility)',
	solar_thermal: 'Solar (Thermal)',
	solar_rooftop: 'Solar (Rooftop)',
	wind: 'Wind',
	nuclear: 'Nuclear',
	imports: 'Imports',
	exports: 'Exports',
	interconnector: 'Interconnector',
	bioenergy: 'Bioenergy',
	coal: 'Coal',
	gas: 'Gas',
	solar: 'Solar'
};

/**
 * Takes an array of records and sorts them into days,
 * and groups together commom record types within the days
 * @param {import("./types/fuel_tech.types").FuelTechCode} ftCode
 * @returns {string}
 */
export const fuelTechName = (ftCode) => fuelTechNameMap[ftCode] || ftCode;
