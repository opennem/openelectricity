import { regions, fuelTechOptions } from '../../../page-data-options/filters';

/**
 * @param {string | undefined} v
 */
function checkFuelTech(v) {
	return fuelTechOptions.find((ft) => ft.value === v);
}

/**
 * @param {string} id
 * @returns {MilestoneRecord | undefined}
 */
export default function parseId(id) {
	if (!id) return undefined;

	let idArr = id.split('.');

	// network_id is the second item in the array
	let network_id = idArr[1];

	// confirm the third item in the array is a network_region (i.e. au.nem.nsw1)
	// if not, then the first two items are the network_id (i.e. au.nem)
	let hasNetworkRegion = regions.find((r) => idArr[2] === r.value);
	let network_region = hasNetworkRegion ? idArr[2] : null;

	// if hasNetworkRegion, then check if there is fuelTech in the fourth item in the array
	// if not, then check if there is fuelTech in the third item in the array
	let hasFuelTech = hasNetworkRegion ? checkFuelTech(idArr[3]) : checkFuelTech(idArr[2]);
	let fueltech_id = /** @type {FuelTechCode | undefined} */ (
		hasFuelTech ? hasFuelTech.value : undefined
	);

	// last three items are the metric, period, and aggregate
	let metric = idArr[idArr.length - 3];
	let period = idArr[idArr.length - 2];
	let aggregate = idArr[idArr.length - 1];

	return {
		network_region,
		network_id,
		fueltech_id,
		metric,
		period,
		aggregate,
		record_id: id
	};
}
