import { differenceInMonths, parse } from 'date-fns';
import useDate from '$lib/utils/TimeSeries/use-date';

/**
 * @param {string} dateStr
 * @returns {Date}
 */
function toDate(dateStr) {
	return parse(useDate(dateStr), 'yyyy-MM-dd', new Date());
}

/**
 * Align an array of StatsData records to a common start/last range so every
 * record's `history.data` array has the same length and indexes line up.
 *
 * Required for `Statistic.group()` and `addTotalMinusLoads()`, which zip-sum
 * by index and assume `data[0].history.data.length` matches every other record.
 *
 * Padding is applied to the front (when a series starts later than the
 * reference start) and the back (when it ends earlier than the reference last).
 * Empty series — `history.start === ''` or `data.length === 0` — are passed
 * through untouched (no reference to align to).
 *
 * Assumes a monthly interval (`1M`). The legacy `energyParser` makes the same
 * assumption.
 *
 * @param {StatsData[]} stats
 * @param {{ referenceFuelTech?: string, fallbackStart?: string, fallbackLast?: string }} [options]
 * @returns {StatsData[]} A new array with new history objects. Input is not mutated.
 */
export function alignStatsDataToCommonRange(stats, options = {}) {
	if (!stats || stats.length === 0) return [];

	const { referenceFuelTech, fallbackStart, fallbackLast } = options;

	const nonEmpty = stats.filter((d) => d.history?.start && d.history.data.length > 0);
	if (nonEmpty.length === 0) return stats.map((d) => cloneRecord(d));

	let refStart;
	let refLast;

	if (referenceFuelTech) {
		const ref = nonEmpty.find((d) => d.fuel_tech === referenceFuelTech);
		if (ref) {
			refStart = ref.history.start;
			refLast = ref.history.last;
		}
	}

	if (!refStart || !refLast) {
		// Default reference = widest span across all non-empty series.
		// ISO-8601 strings sort lexicographically, so direct < / > comparisons work.
		refStart = nonEmpty[0].history.start;
		refLast = nonEmpty[0].history.last;
		for (const d of nonEmpty) {
			if (d.history.start < refStart) refStart = d.history.start;
			if (d.history.last > refLast) refLast = d.history.last;
		}
	}

	if (fallbackStart && fallbackStart < refStart) refStart = fallbackStart;
	if (fallbackLast && fallbackLast > refLast) refLast = fallbackLast;

	const refStartDate = toDate(refStart);
	const refLastDate = toDate(refLast);

	return stats.map((d) => {
		if (!d.history?.start || d.history.data.length === 0) return cloneRecord(d);

		const startDiff = differenceInMonths(toDate(d.history.start), refStartDate);
		const lastDiff = differenceInMonths(refLastDate, toDate(d.history.last));

		const data = [
			...(startDiff > 0 ? new Array(startDiff).fill(null) : []),
			...d.history.data,
			...(lastDiff > 0 ? new Array(lastDiff).fill(null) : [])
		];

		return {
			...d,
			history: {
				...d.history,
				start: startDiff > 0 ? refStart : d.history.start,
				last: lastDiff > 0 ? refLast : d.history.last,
				data
			}
		};
	});
}

/**
 * @param {StatsData} d
 * @returns {StatsData}
 */
function cloneRecord(d) {
	return { ...d, history: { ...d.history, data: [...(d.history?.data ?? [])] } };
}
