import { addMonths, subMonths, isAfter } from 'date-fns';
import PerfTime from './perf-time.js';

const perfTime = new PerfTime('rolling-sum-12-mth');

/**
 * @param {TimeSeriesData[]} data
 * @param {string[]} keys
 * @returns {TimeSeriesData[]}
 */
export default function rollingSum12Mth(data, keys) {
	perfTime.time();

	/** @type {TimeSeriesData[]} */
	const cloneData = data.map((d) => ({
		...d,
		date: new Date(d.date)
	}));

	for (let x = cloneData.length - 1; x >= 0; x--) {
		const current = cloneData[x];
		const windowStart = subMonths(current.date, 12);

		keys.forEach((k) => {
			let sum = /** @type {number} */ (current[k] ?? 0);
			let hasNulls = current[k] == null;

			for (let i = x - 1; i >= 0 && isAfter(cloneData[i].date, windowStart); i--) {
				if (cloneData[i][k] == null) {
					hasNulls = true;
				}
				sum += /** @type {number} */ (cloneData[i][k] ?? 0);
			}

			cloneData[x][k] = hasNulls ? null : sum;
		});
	}

	// filter out incomplete rolling sums (first 12 months)
	const firstAvailable = addMonths(cloneData[0].date, 12);
	const updated = cloneData.filter((d) => isAfter(d.date, firstAvailable));

	perfTime.timeEnd('--- data.12month-rolling-sum');

	return updated;
}
