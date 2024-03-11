import { formatInTimeZone } from 'date-fns-tz';
import { fuelTechName, fuelTechColour } from '$lib/fuel_techs.js';

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
export const domainGroups = {
	// battery_charging: ['battery_charging'],
	// pumps: ['pumps'],
	// exports: ['exports'],
	// imports: ['imports'],
	coal: ['coal_black', 'coal_brown'],
	// bioenergy: ['bioenergy_biogas', 'bioenergy_biomass'],
	// distillate: ['distillate'],
	gas: ['gas_ccgt', 'gas_ocgt', 'gas_recip', 'gas_steam', 'gas_wcmg'],
	// battery_discharging: ['battery_discharging'],
	hydro: ['hydro'],
	wind: ['wind'],
	solar: ['solar_utility', 'solar_rooftop']
};

export const domainOrder = [
	// 'battery_charging',
	// 'pumps',
	// 'exports',
	// 'imports',
	'coal',
	// 'bioenergy',
	// 'distillate',
	'gas',
	// 'battery_discharging',
	'hydro',
	'wind',
	'solar'
];

/** @type {FuelTechCode[]} */
export const loadFts = ['exports', 'battery_charging', 'pumps'];

export const labelReducer = (
	/** @type {Object.<string, string>} */ acc,
	/** @type {StatsData} **/ d
) => {
	acc[d.id] = d.fuel_tech ? fuelTechName(d.fuel_tech) : '';
	return acc;
};

export const colourReducer = (
	/** @type {Object.<string, string>} */ acc,
	/** @type {StatsData} **/ d
) => {
	acc[d.id] = d.fuel_tech ? fuelTechColour(d.fuel_tech) : '';
	return acc;
};
