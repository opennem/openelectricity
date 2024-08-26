const batteryAndLoads = [
	'battery_discharging',
	'battery_VPP_discharging',
	'battery_distributed_discharging',
	'battery_charging',
	'battery_VPP_charging',
	'battery_distributed_charging',
	'battery',
	'exports',
	'pumps'
];

/**
 *
 * @param {Object.<FuelTechCode, FuelTechCode[]>} fuelTechs
 * @returns
 */
export default function (fuelTechs) {
	const filterKeys = Object.keys(fuelTechs).filter((key) => !batteryAndLoads.includes(key));

	console.log('filterkeys', filterKeys, fuelTechs);
	return filterKeys.reduce((/** @type Object.<FuelTechCode, FuelTechCode[]> */ acc, key) => {
		acc[key] = fuelTechs[key];
		return acc;
	}, {});
}
