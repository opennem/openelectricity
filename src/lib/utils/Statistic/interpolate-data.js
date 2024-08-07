import { parseISO } from 'date-fns';
import parseInterval from '$lib/utils/intervals';
import interpolate from './interpolate-array';

/**
 *
 * @param {StatsData[]} datasets
 * @param {StatsInterval | undefined} minIntervalObj
 * @param {StatsType} statsType
 */
export default function (datasets, minIntervalObj, statsType = 'history') {
	const statsObj = (d) => d[statsType] || d.history;

	const toBeInterpolated = datasets.filter(
		(d) => statsObj(d).interval !== minIntervalObj?.intervalString
	);

	const otherDataset = /** @type {StatsData} */ (
		datasets.find((d) => statsObj(d).interval === minIntervalObj?.intervalString)
	);

	/** @type {StatsData[]} */
	const interpolated = [];

	toBeInterpolated.forEach((set) => {
		const newSet = { ...set };
		newSet[statsType] = { ...set[statsType] };

		if (set.forecast) {
			newSet[statsType].data = [...set[statsType].data, ...set.forecast.data];
			newSet[statsType].last = set.forecast.last;
		} else {
			// TODO: This is a temporary fix for the lack of forecast data
			newSet[statsType].last = otherDataset.history.last;
		}
		const intervalObj = parseInterval(set[statsType].interval);

		newSet[statsType].data = interpolate(
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
