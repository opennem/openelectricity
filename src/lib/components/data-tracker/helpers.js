import { parseISO } from 'date-fns';
import { fuelTechGroup, fuelTechColour, fuelTechOrder } from '$lib/fuel_techs.js';
import deepCopy from '$lib/utils/deep-copy';
import { getKeys } from '$lib/utils/keys';
import { parse as parseInterval } from '$lib/utils/time-series-helpers/intervals';
import {
	interpolateData,
	transformData,
	calculateMeanArray
} from '$lib/utils/time-series-helpers/transform/power';

/** @type {Object.<FuelTechCode, FuelTechCode[]>}} */
const historicalEnergyGroupMap = {
	battery_charging: ['battery_charging'],
	pumps: ['pumps'],
	exports: ['exports'],
	imports: ['imports'],
	coal: ['coal_black', 'coal_brown'],
	gas: ['gas_ccgt', 'gas_ocgt', 'gas_recip', 'gas_steam', 'gas_wcmg'],
	battery: ['battery_discharging'],
	hydro: ['hydro'],
	wind: ['wind'],
	solar: ['solar_utility', 'solar_rooftop']
};

const historicalEnergyGroups = /** @type {FuelTechCode[]} */ (getKeys(historicalEnergyGroupMap));

/** @type {FuelTechCode[]} */
const loadFts = ['exports', 'battery_charging', 'pumps'];

export function isLoad(ft) {
	return loadFts.includes(ft);
}
/**
 * @param {{ groups: Object.<FuelTechCode, FuelTechCode[]>, data: StatsData[], statsType: StatsType }} options
 * @returns {StatsData[]}
 */
export function group({ groups, data, statsType = 'history' }) {
	/** @type {StatsData[]} */
	let grouped = [];
	const groupKeys = /** @type {FuelTechCode[]} */ (Object.keys(groups));

	groupKeys.forEach((code) => {
		const codes = fuelTechGroup(groups, code);
		const filtered = data.filter((d) => (d.fuel_tech ? codes.includes(d.fuel_tech) : false));

		if (filtered.length > 0) {
			const data = filtered[0][statsType];
			const groupObject = {
				...filtered[0],
				code,
				fuel_tech: code,
				id: `au.${code}.grouped.${statsType}`,
				[statsType]: { ...data }
			};

			// set the group history.data array to all zeros
			groupObject[statsType].data = groupObject[statsType].data.map(() => 0);

			// sum each filtered history.data array into group history data
			filtered.forEach((d) => {
				d[statsType].data.forEach(
					/**
					 * @param {number} d
					 * @param {number} i
					 */ (d, i) => {
						groupObject[statsType].data[i] += d;
					}
				);
			});

			grouped.push(groupObject);
		}
	});

	return grouped;
}

/**
 *
 * @param {StatsData[]} datasets
 * @param {StatsInterval} minIntervalObj
 * @param {StatsType} statsType
 */
export function interpolateDatasets(datasets, minIntervalObj, statsType = 'history') {
	const toBeInterpolated = datasets.filter(
		(d) => d[statsType].interval !== minIntervalObj?.intervalString
	);
	const otherDataset = /** @type {StatsData} */ (
		datasets.find((d) => d[statsType].interval === minIntervalObj?.intervalString)
	);

	/** @type {StatsData[]} */
	const interpolated = [];

	toBeInterpolated.forEach((set) => {
		const newSet = { ...set };
		newSet[statsType] = { ...set[statsType] };

		if (set.forecast) {
			newSet[statsType].data = [...set[statsType].data, ...set.forecast.data];
			newSet[statsType].last = set.forecast.last;
		}
		const intervalObj = parseInterval(set[statsType].interval);

		newSet[statsType].data = interpolateData(
			newSet[statsType].data,
			intervalObj.incrementerValue,
			minIntervalObj?.incrementerValue
		);

		newSet[statsType].interval = minIntervalObj?.intervalString || '';

		interpolated.push(newSet);
	});

	interpolated.forEach((set) => {
		if (set[statsType]) {
			const data = set[statsType].data;
			const seconds = minIntervalObj?.seconds || 0;
			const interval = seconds * 1000;
			const startTime = parseISO(set[statsType].start);

			const start =
				otherDataset && otherDataset[statsType] ? otherDataset[statsType].start || '' : '';
			const last =
				otherDataset && otherDataset[statsType] ? otherDataset[statsType].last || '' : '';
			const dataStartDate = parseISO(start);
			const dataLastDate = parseISO(last);

			const filteredData = data.filter((value, i) => {
				const currentTime = new Date(startTime.getTime() + i * interval);
				return currentTime >= dataStartDate && currentTime <= dataLastDate;
			});

			set[statsType].data = filteredData;
			set[statsType].start = start;
			set[statsType].last = last;
		}
	});

	return interpolated;
}

/**
 * Merge (forecast/history) -> Interpolate -> Filter -> Mutate -> Group -> Transform
 * @param {StatsData[]} originalData
 * @param {StatsType} statsType
 * @returns
 */
export function filter(originalData, statsType = 'history') {
	/** @type {StatsData[]} */
	const data = deepCopy(originalData);

	// Merge forecast and other stats type data to make it easy to calculate dataset
	// - improve this later
	if (statsType !== 'forecast') {
		data.forEach((d) => {
			if (d.forecast) {
				d[statsType].data = [...d[statsType].data, ...d.forecast.data];
				d[statsType].last = d.forecast.last;
			}
		});
	}
	console.log('after merge data', data);

	// Find out if there are multiple intervals in the dataset
	const intervalArr = [...new Set(data.map((d) => d[statsType].interval))].map((i) =>
		parseInterval(i)
	);

	// Get the smallest interval data
	const minIntervalObj = intervalArr.find(
		(i) => i.seconds === Math.min(...intervalArr.map((i) => i.seconds))
	);

	if (!minIntervalObj) console.warn('No minIntervalObj found', intervalArr);

	console.log('intervalArr', intervalArr, minIntervalObj);

	// interpolate
	const interpolated = minIntervalObj ? interpolateDatasets(data, minIntervalObj, statsType) : [];

	console.log('interpolated', interpolated);

	/** @type {StatsData[]} */
	const combined = [];

	[
		...data.filter((d) => d[statsType].interval === minIntervalObj?.intervalString),
		...interpolated
	].forEach((set) => {
		const newSet = { ...set };
		newSet[statsType] = { ...set[statsType] };

		if (set[statsType].interval === '5m') {
			// convert to 30m
			newSet[statsType].interval = '30m';
			newSet[statsType].data = calculateMeanArray(set[statsType].data, 5, 30);
		}
		combined.push(newSet);
	});

	/** @type {StatsData[]} */
	const filtered = [];

	// Find/Filter
	fuelTechOrder.forEach((code) => {
		const find = combined.find((d) => d.fuel_tech === code);
		if (find) {
			filtered.push(deepCopy(find));
		}
	});

	// Mutate stats data - (note only one statType is changed?)
	// - set colour
	// - invert load values
	filtered.forEach((d) => {
		const ft = d.fuel_tech;

		if (ft) {
			// set colour
			d.colour = fuelTechColour(ft);

			// invert load values
			if (loadFts.includes(ft)) {
				d[statsType].data.forEach(
					/**
					 * @param {number} value
					 * @param {number} i
					 */
					(value, i) => {
						d[statsType].data[i] = value * -1;
					}
				);
			}
		}
	});

	const grouped = group({ groups: historicalEnergyGroupMap, data: filtered, statsType });

	console.log('filtered grouped', combined, filtered, grouped);

	const transformed = transformData(grouped, '30m', statsType);

	return grouped;
}
