import { format as d3Format } from 'd3-format';
import { formatInTimeZone } from 'date-fns-tz';

import { fuelTechGroup, fuelTechGroupMap, historicalEnergyGroupMap } from '$lib/fuel_techs.js';

export const formatTickX = (/** @type {Date} */ d) => formatInTimeZone(d, '+10:00', 'yyyy');
export const formatTickY = (/** @type {number} */ d) => d3Format('~s')(d);
export const formatValue = (/** @type {number} */ d) => {
	const formatted = d3Format('.0f')(d / 1000);
	if (formatted !== '0') {
		return formatted + 'k';
	}
	return formatted;
};

/**
 * @param {FuelTechCode[]} groups
 * @param {IspData[]} originalData
 * @returns {IspData[]}
 */
export function groupedIspData(groups, originalData) {
	/** @type {IspData[]} */
	let grouped = [];

	groups.forEach((code) => {
		const codes = fuelTechGroup(fuelTechGroupMap, code);
		const filtered = originalData.filter((d) => codes.includes(d.fuel_tech));

		if (filtered.length > 0) {
			const projection = filtered[0].projection;
			const groupObject = {
				...filtered[0],
				fuel_tech: code,
				id: `${code}.${filtered[0].scenario}.${filtered[0].pathway.toLowerCase()}`,
				projection: { ...projection }
			};

			// set the group projection.data array to all zeros
			groupObject.projection.data = groupObject.projection.data.map(() => 0);

			// sum each filtered projection.data array into group projection data
			filtered.forEach((d) => {
				d.projection.data.forEach((d, i) => {
					groupObject.projection.data[i] += d;
				});
			});

			grouped.push(groupObject);
		}
	});

	return grouped;
}

/**
 * @param {FuelTechCode[]} groups
 * @param {StatsData[]} originalData
 * @returns {StatsData[]}
 */
export function groupedStatsData(groups, originalData) {
	/** @type {StatsData[]} */
	let grouped = [];

	groups.forEach((code) => {
		const codes = fuelTechGroup(historicalEnergyGroupMap, code);
		const filtered = originalData.filter((d) => codes.includes(d.fuel_tech));

		if (filtered.length > 0) {
			const history = filtered[0].history;
			const groupObject = {
				...filtered[0],
				code,
				fuel_tech: code,
				id: `au.${code}.historical`,
				history: { ...history }
			};

			// set the group projection.data array to all zeros
			groupObject.history.data = groupObject.history.data.map(() => 0);

			// sum each filtered projection.data array into group projection data
			filtered.forEach((d) => {
				d.history.data.forEach((d, i) => {
					groupObject.history.data[i] += d;
				});
			});

			grouped.push(groupObject);
		}
	});

	return grouped;
}
