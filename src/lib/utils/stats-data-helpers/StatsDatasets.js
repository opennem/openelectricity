import deepCopy from '$lib/utils/deep-copy';
import getMinInterval from './min-interval';
import mergeStatsType from './merge-stats-type';
import interpolateDatasets from './interpolate-data';

/**
 *
 * @param {StatsData[]} data
 * @param {StatsType | undefined} statsType
 */
function StatsDatasets(data, statsType) {
	this.data = data;
	this.statsType = statsType || 'history';
	this.minIntervalObj = getMinInterval(data, this.statsType);
}

StatsDatasets.prototype.mergeAndInterpolate = function () {
	const merged = mergeStatsType(this.data, this.statsType);
	const interpolated = interpolateDatasets(merged, this.minIntervalObj, this.statsType);
	this.data = [
		...merged.filter((d) => d[this.statsType].interval === this.minIntervalObj?.intervalString),
		...interpolated
	];
	return this;
};

StatsDatasets.prototype.reorder = function (/** @type {string[]} */ domainOrder) {
	/** @type {StatsData[]} */
	const data = [];

	// Reorder
	domainOrder.forEach((domain) => {
		const find = this.data.find((d) => d.fuel_tech === domain);
		if (find) {
			data.push(deepCopy(find));
		}
	});

	this.data = data;
	return this;
};

StatsDatasets.prototype.invertLoadValues = function (/** @type {string[]} */ loads) {
	this.data.forEach((d) => {
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

StatsDatasets.prototype.group = function (/** @type {Object} */ groupMap) {
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

	/** @type {StatsData[]} */
	const grouped = [];
	const groupKeys = /** @type {FuelTechCode[]} */ (Object.keys(groupMap));

	groupKeys.forEach((code) => {
		const codes = getCodes(groupMap, code);
		const filtered = this.data.filter((d) => (d.fuel_tech ? codes.includes(d.fuel_tech) : false));

		if (filtered.length > 0) {
			const data = filtered[0][this.statsType];
			const groupObject = {
				...filtered[0],
				code,
				fuel_tech: code,
				id: `au.${code}.grouped.${this.statsType}`,
				[this.statsType]: { ...data }
			};

			// set the group history.data array to all zeros
			groupObject[this.statsType].data = groupObject[this.statsType].data.map(() => 0);

			// sum each filtered history.data array into group history data
			filtered.forEach((d) => {
				d[this.statsType].data.forEach(
					/**
					 * @param {number | null} d
					 * @param {number} i
					 */ (d, i) => {
						groupObject[this.statsType].data[i] += d || 0;
					}
				);
			});

			grouped.push(groupObject);
		}
	});

	this.data = grouped;

	return this;
};

export default StatsDatasets;
