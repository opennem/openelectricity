import deepCopy from '../deep-copy';
import { parseUnit } from '../si-units';
import getMinInterval from './min-interval';
import mergeStatsType from './merge-stats-type';
import interpolateDatasets from './interpolate-data';
import totalMinusLoadsStats from './total-minus-loads-stats';

/**
 *
 * @param {StatsData[]} data
 * @param {StatsType | undefined} statsType
 * @param {string} unit
 */
function Statistic(data, statsType, unit = '') {
	this.originalData = deepCopy(data);
	this.data = deepCopy(data);
	this.statsType = statsType || 'history';
	this.minIntervalObj = getMinInterval(data, this.statsType);

	this.statsUnit = unit;

	const { baseUnit, prefix } = parseUnit(unit);

	this.prefix = prefix;
	this.baseUnit = baseUnit;
}

Statistic.prototype.mergeAndInterpolate = function () {
	const merged = mergeStatsType(this.data, this.statsType);
	const interpolated = interpolateDatasets(merged, this.minIntervalObj, this.statsType);

	this.data = [
		...merged.filter((d) => d[this.statsType].interval === this.minIntervalObj?.intervalString),
		...interpolated
	];
	return this;
};

Statistic.prototype.interpolateSolarRooftopData = function () {
	/**
	 * TODO: Move this function to a more appropriate location
	 * @param {*} array
	 * @returns
	 */
	function interpolateNulls(array) {
		let result = [...array]; // Clone the array to avoid modifying the original

		for (let i = 0; i < result.length; i++) {
			if (result[i] === null) {
				// Find the previous non-null value
				let prevIndex = i - 1;
				while (prevIndex >= 0 && result[prevIndex] === null) {
					prevIndex--;
				}

				// Find the next non-null value
				let nextIndex = i + 1;
				while (nextIndex < result.length && result[nextIndex] === null) {
					nextIndex++;
				}

				if (prevIndex >= 0 && nextIndex < result.length) {
					// Perform linear interpolation
					const prevValue = result[prevIndex];
					const nextValue = result[nextIndex];
					const step = (nextValue - prevValue) / (nextIndex - prevIndex);
					result[i] = prevValue + step * (i - prevIndex);
				} else if (prevIndex >= 0) {
					// If there's no next value, propagate the last known value
					result[i] = result[prevIndex];
				} else if (nextIndex < result.length) {
					// If there's no previous value, propagate the next known value
					result[i] = result[nextIndex];
				}
			}
		}

		return result;
	}

	const solarRooftopData = this.data.find((d) => d.fuel_tech === 'solar_rooftop');
	if (solarRooftopData) {
		solarRooftopData.history.data = interpolateNulls(solarRooftopData.history.data);
	}
	return this;
};

Statistic.prototype.reorder = function (/** @type {Array.<string | FuelTechCode>} */ domainOrder) {
	/** @type {StatsData[]} */
	const data = [];

	// Reorder
	domainOrder.forEach((domain) => {
		const find = this.data.find((/** @type {StatsData} */ d) => d.fuel_tech === domain);
		if (find) {
			data.push(deepCopy(find));
		}
	});

	this.data = data;
	return this;
};

Statistic.prototype.invertValues = function (/** @type {string[]} */ loads) {
	this.data.forEach((/** @type {StatsData} */ d) => {
		const ft = d.fuel_tech;

		if (ft && loads.includes(ft)) {
			d[this.statsType].data.forEach(
				/**
				 * @param {number | null} value
				 * @param {number} i
				 */
				(value, i) => {
					d[this.statsType].data[i] = value || value === 0 ? value * -1 : null;
				}
			);
		}
	});
	return this;
};

Statistic.prototype.group = function (
	/** @type {Object} */ groupMap,
	/** @type {string[]} */ loads = [],
	/** @type {boolean} */ useProvidedId = false
) {
	/**
	 *
	 * @param {*} groupMap
	 * @param {*} groupCode
	 * @returns
	 */
	const getCodes = (groupMap, groupCode) => {
		if (groupMap[groupCode]) return groupMap[groupCode];
		return [groupCode];
	};

	/** @type {*} */
	const grouped = [];
	const groupKeys = /** @type {FuelTechCode[]} */ (Object.keys(groupMap));

	const start = this.data && this.data.length ? this.data[0][this.statsType].start : '';
	const last = this.data && this.data.length ? this.data[0][this.statsType].last : '';
	const interval = this.data && this.data.length ? this.data[0][this.statsType].start : '';
	const dataLength = this.data && this.data.length ? this.data[0][this.statsType].data.length : 0;

	groupKeys.forEach((code) => {
		const codes = getCodes(groupMap, code);
		const filtered = this.data.filter((/** @type {StatsData} */ d) =>
			d.fuel_tech ? codes.includes(d.fuel_tech) : false
		);

		if (filtered.length > 0) {
			const data = filtered[0][this.statsType];
			const groupObject = {
				...filtered[0],
				code,
				fuel_tech: code,
				// id: `au.${code}.grouped.${this.statsType}`,
				id: useProvidedId ? filtered[0].id : `au.${code}.grouped`,
				isLoad: loads.includes(code),
				[this.statsType]: { ...data }
			};

			// set the group history.data array to all zeros
			groupObject[this.statsType].data = groupObject[this.statsType].data.map(() => null);

			// sum each filtered history.data array into group history data
			filtered.forEach((/** @type {StatsData} */ d) => {
				d[this.statsType].data.forEach(
					/**
					 * @param {number | null} d
					 * @param {number} i
					 */ (d, i) => {
						groupObject[this.statsType].data[i] += d || null;
					}
				);
			});

			grouped.push(groupObject);
		}
		// else {
		// 	const groupObject = {
		// 		code,
		// 		fuel_tech: code,
		// 		id: `au.${code}.grouped`,
		// 		isLoad: loads.includes(code),
		// 		[this.statsType]: {
		// 			data: dataLength ? new Array(dataLength).fill(null) : [],
		// 			interval,
		// 			last,
		// 			start
		// 		}
		// 	};
		// 	grouped.push(groupObject);
		// }
	});

	this.data = grouped;

	return this;
};

Statistic.prototype.addTotalMinusLoads = function (
	/** @type {FuelTechCode[]} */ loads,
	/** @type {string} */ id
) {
	this.data.push(totalMinusLoadsStats(this.originalData, this.statsType, loads, id));
	return this;
};

export default Statistic;
