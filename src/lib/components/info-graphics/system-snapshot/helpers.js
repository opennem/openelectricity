/** @type {FuelTechCode[]} */
export const loadFts = ['exports', 'battery_charging', 'pumps'];

/** @type {FuelTechCode[]} */
export const renewablesFts = [
	'hydro',
	'wind',
	'solar_rooftop',
	'solar_utility',
	'bioenergy_biomass'
];

/**
 * @param {string[]} regions
 * @param {Record<string, any[]>} regionData
 * @returns {Record<string, number>}
 */
export function regionGenerationTotal(regions, regionData) {
	/** @type {Record<string, number>} */
	const regionGeneration = {};

	regions.forEach((/** @type {string} */ r) => {
		const region = /** @type {any} */ (regionData)[r];
		const total = region.reduce(
			(/** @type {number} */ acc, /** @type {any} */ cur) =>
				loadFts.includes(cur.fuel_tech) ? acc - cur.data : acc + cur.data,
			0
		);
		/** @type {any} */ (regionGeneration)[r] = total;
	});

	return regionGeneration;
}

/**
 * @param {string[]} regions
 * @param {Record<string, any[]>} regionData
 * @returns {Record<string, number>}
 */
export function regionRenewablesTotal(regions, regionData) {
	/** @type {Record<string, number>} */
	const regionRenewables = {};

	regions.forEach((/** @type {string} */ r) => {
		const region = /** @type {any} */ (regionData)[r];
		const total = region.reduce(
			(/** @type {number} */ acc, /** @type {any} */ cur) =>
				renewablesFts.includes(cur.fuel_tech) ? acc + cur.data : acc,
			0
		);
		/** @type {any} */ (regionRenewables)[r] = total;
	});

	return regionRenewables;
}

/**
 * @param {string[]} regions
 * @param {Record<string, any[]>} regionData
 * @returns {Record<string, number>}
 */
export function regionEmissionsTotal(regions, regionData) {
	/** @type {Record<string, number>} */
	const regionEmissions = {};

	regions.forEach((/** @type {string} */ r) => {
		const region = /** @type {any} */ (regionData)[r];
		const total = region.reduce(
			(/** @type {number} */ acc, /** @type {any} */ cur) =>
				loadFts.includes(cur.fuel_tech)
					? cur.fuel_tech === 'exports'
						? acc - cur.data
						: acc
					: acc + cur.data,
			0
		);
		/** @type {any} */ (regionEmissions)[r] = total;
	});

	return regionEmissions;
}
