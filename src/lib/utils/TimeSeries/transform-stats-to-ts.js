import { parseISO } from 'date-fns';
import useDate from './use-date';
import parseInterval from '../intervals';
import timeBucket from './time-bucket';
import timeSeries from './time-series';

/**
 * Parse a stats date string into a Date object.
 * Sub-day intervals use parseISO (preserves time); others use date-only portion.
 * @param {string} dateStr
 * @param {boolean} isLessThanDay
 * @returns {Date}
 */
function parseStatsDate(dateStr, isLessThanDay) {
	return isLessThanDay ? parseISO(dateStr) : new Date(useDate(dateStr));
}

/**
 *
 * @param {StatsData[]} dataset
 * @param {DataRange | StatsInterval} outputRange
 * @param {StatsType} statsType
 * @returns {TimeSeriesData[]}
 */
export default function (dataset, outputRange, statsType = 'history') {
	const intervalObj = typeof outputRange === 'string' ? parseInterval(outputRange) : outputRange;
	const isLessThanDay = intervalObj.seconds < 86400;

	// Find the earliest start and latest last across ALL datasets so the time
	// bucket covers every series. Previously only starts[0]/lasts[0] were used,
	// which caused data misalignment when datasets had different date ranges.
	/** @type {string | undefined} */
	let earliestStart;
	/** @type {string | undefined} */
	let latestLast;

	for (const d of dataset) {
		const s = d[statsType];
		if (!s?.start || !s?.last) continue;
		if (!earliestStart || s.start < earliestStart) earliestStart = s.start;
		if (!latestLast || s.last > latestLast) latestLast = s.last;
	}

	if (!earliestStart || !latestLast) return [];

	const startDate = parseStatsDate(earliestStart, isLessThanDay);
	const lastDate = parseStatsDate(latestLast, isLessThanDay);

	const bucket = timeBucket({
		start: intervalObj.startOfFn(startDate),
		last: intervalObj.startOfFn(lastDate),
		incrementer: intervalObj.incrementerFn,
		incrementValue: intervalObj.incrementerValue
	});

	/** @type {TimeSeriesData[]} */
	const tsData = timeSeries({
		bucket,
		dataset,
		dataProp: statsType,
		bucketStartTime: bucket.length > 0 ? bucket[0].time : 0,
		parseDate: (/** @type {string} */ dateStr) => parseStatsDate(dateStr, isLessThanDay),
		startOfFn: intervalObj.startOfFn
	});

	return tsData;
}
