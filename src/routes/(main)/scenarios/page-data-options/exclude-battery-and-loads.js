// Loads (and storage *charging*) hidden unless "Include Loads" is on.
// Battery (discharging) is intentionally NOT listed here — it's a generation
// source and always shown in the technology breakdown.
const loads = [
	'battery_charging',
	'battery_VPP_charging',
	'battery_distributed_charging',
	'exports',
	'pumps',
	'storage_charging'
];

/**
 *
 * @param {Object.<FuelTechCode, FuelTechCode[]>} fuelTechs
 * @returns
 */
export default function (fuelTechs) {
	const filterKeys = Object.keys(fuelTechs).filter((key) => !loads.includes(key));

	return filterKeys.reduce((/** @type Object.<FuelTechCode, FuelTechCode[]> */ acc, key) => {
		acc[key] = fuelTechs[key];
		return acc;
	}, {});
}
