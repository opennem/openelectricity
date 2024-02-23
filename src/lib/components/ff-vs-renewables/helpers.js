import { format as d3Format } from 'd3-format';
import { formatInTimeZone } from 'date-fns-tz';

import deepCopy from '$lib/utils/deep-copy';
import {
	fuelTechGroup,
	fuelTechNames,
	fuelTechNameMap,
	fuelTechColour,
	fossilRenewablesGroupMap
} from '$lib/fuel_techs.js';
import { transform as transformEnergy } from '$lib/utils/time-series-helpers/transform/energy';
import transformRollingSum12Mth from '$lib/utils/rolling-sum-12-mth';

export const formatTickX = (/** @type {Date} */ d) => formatInTimeZone(d, '+10:00', 'yyyy');
export const formatTickY = (/** @type {number} */ d) => `${d3Format('~s')(d)}%`;
export const displayXTicks = [2000, 2005, 2010, 2015, 2020, 2025, 2030].map(
	(year) => new Date(`${year}-01-01`)
);

/**
 * return stats data object with total generation
 * NOTE: the sum to be used for % calculations do not include any loads - only generation
 * @param {StatsData[]} data
 * @returns {StatsData}
 */
export function calculateTotalStatsData(data) {
	/**
	 * Default values
	 * @type {StatsData}
	 */
	const totalStats = {
		data_type: 'energy',
		id: 'au.total.historical',
		network: 'nem',
		type: 'energy',
		units: 'GWh',
		history: {
			data: [],
			interval: '1M',
			start: '',
			last: ''
		}
	};

	const isLoads = (/** @type {FuelTechCode | undefined} */ ft) => {
		return ft === 'battery_charging' || ft === 'pumps';
	};

	data.forEach((series, i) => {
		if (i === 0) {
			// create a new array of stats data
			totalStats.history.data = series.history.data.map(() => 0);
			totalStats.history.start = series.history.start;
			totalStats.history.last = series.history.last;
		}

		// NOTE: the sum to be used for % calculations do not include any loads - only generation
		series.history.data.forEach((d, i) => {
			const value = totalStats.history.data[i];
			if (isLoads(series.fuel_tech)) {
				// totalStats.history.data[i] -= d || 0;
			} else {
				totalStats.history.data[i] = Number(value) + Number(d || 0);
			}
		});
	});

	return totalStats;
}

/**
 *
 * @param {StatsData[]} data
 * @returns {StatsData[]}
 */
export function getOrderedStatsData(data) {
	/** @type {StatsData[]} */
	const ordered = [];

	fuelTechNames.forEach((/** @type {*} */ code) => {
		const find = data.find((d) => d.fuel_tech === code);
		if (find) {
			const copy = deepCopy(find);
			copy.colour = fuelTechColour(code);
			ordered.push(copy);
		}
	});

	return ordered;
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
		const codes = fuelTechGroup(fossilRenewablesGroupMap, code);
		const filtered = originalData.filter((/** @type {*} */ d) => codes.includes(d.fuel_tech));

		if (filtered.length > 0) {
			const history = filtered[0].history;
			const groupObject = {
				...filtered[0],
				code,
				fuel_tech: code,
				label: fuelTechNameMap[code],
				id: `au.${code}.historical`,
				history: { ...history }
			};

			// set the group projection.data array to all zeros
			groupObject.history.data = groupObject.history.data.map(() => 0);

			// sum each filtered projection.data array into group projection data
			filtered.forEach((d) => {
				d.history.data.forEach((d, i) => {
					const value = groupObject.history.data[i];
					groupObject.history.data[i] = Number(value) + Number(d || 0);
				});
			});

			grouped.push(groupObject);
		}
	});

	return grouped;
}

/**
 *
 * @param {StatsData[]} statsDataset
 * @returns
 */
export function getKeysAndRollingSumPercentDataset(statsDataset) {
	const transformed = transformEnergy(statsDataset, 'history', '1M');

	const keys =
		transformed && transformed.length
			? Object.keys(transformed[0]).filter(
					(d) => d !== 'date' && d !== 'time' && d !== 'au.total.historical'
			  )
			: [];

	const rollingSumSeriesNames =
		transformed && transformed.length
			? Object.keys(transformed[0]).filter((d) => d !== 'date' && d !== 'time')
			: [];

	const rollingSum = transformRollingSum12Mth(transformed, rollingSumSeriesNames);
	const rollingSumPercentageDataset = rollingSum.map((d) => {
		/** @type {TimeSeriesData} */
		const obj = {
			date: d.date,
			time: d.time
		};

		const total = /** @type {number} */ (d['au.total.historical']);

		keys.forEach((key) => {
			const seriesValue = /** @type {number} */ (d[key]);
			if (seriesValue && total) {
				obj[key] = (seriesValue / total) * 100;
			} else {
				obj[key] = 0;
			}
		});

		return obj;
	});

	return {
		keys,
		rollingSumPercentageDataset
	};
}
