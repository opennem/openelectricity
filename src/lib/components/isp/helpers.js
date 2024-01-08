import { format } from 'd3-format';
import { format as dateFormat } from 'date-fns';

import { fuelTechGroup } from '$lib/fuel_techs.js';

/** @typedef {import('$lib/types/fuel_tech.types').FuelTechCode} FuelTechCode */
/** @typedef {import('$lib/types/chart.types').TimeSeriesData} TimeSeriesData */
/** @typedef {import('$lib/types/isp.types').IspData} IspData */

export const formatTickX = (/** @type {Date} */ d) => dateFormat(d, 'yyyy');
export const formatTickY = (/** @type {number} */ d) => format('~s')(d);

/**
 * @param {TimeSeriesData[]} dataset
 * @param {string[]} seriesNames
 * @param {string[]} loadSeries
 * @returns {TimeSeriesData[]}
 */
export function updateWithMinMaxValues(dataset, seriesNames, loadSeries) {
	return dataset.map((d) => {
		/** @type {TimeSeriesData} */
		const newObj = { ...d };
		// get min and max values for each time series
		newObj._max = 0;
		newObj._min = 0;
		seriesNames.forEach((l) => {
			const value = d[l] || 0;
			if (newObj._max || newObj._max === 0) newObj._max += +value;
		});
		loadSeries.forEach((l) => {
			const value = d[l] || 0;
			if (newObj._min || newObj._min === 0) newObj._min += +value;
		});

		return newObj;
	});
}

/**
 * @param {FuelTechCode[]} groups
 * @param {IspData[]} originalData
 * @returns {IspData[]}
 */
export function groupedIspData(groups, originalData) {
	/** @type {IspData[]} */
	let grouped = [];

	groups.forEach((code) => {
		const codes = fuelTechGroup(code);
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
