import { group, rollup } from 'd3-array';
import { getFormattedMonth, getFormattedDate } from '$lib/utils/formatters';
/**
 *
 * @param {MilestoneRecord[]} data
 * @returns
 */
function groupByMonthDay(data) {
	return rollup(
		data,
		(/** @type {MilestoneRecord[]} */ d) => {
			const intervalDayRecords = d.filter((r) => r.period === 'interval' || r.period === 'day');
			const nonIntervalDayRecords = d.filter((r) => r.period !== 'interval' && r.period !== 'day');
			const latestTime = intervalDayRecords.map((r) => r.time).reduce((a, b) => Math.max(a, b), 0);
			// console.log('rolled d', nonIntervalDayRecords, intervalDayRecords);

			return {
				time: latestTime,
				date: getFormattedDate(new Date(latestTime), 'short', 'short'),
				records: group(intervalDayRecords, (r) => r.record_id),
				nonIntervalDayRecords: nonIntervalDayRecords
			};
		},
		(/** @type {MilestoneRecord} */ d) => {
			// console.log('getFormattedMonth', d);
			// console.log('rolled month', d);
			return getFormattedMonth(d.date, 'short');
		},
		(/** @type {MilestoneRecord} */ d) => {
			// console.log('rolled day', d);
			return getFormattedDate(d.date, 'short');
		}
	);
}

export default groupByMonthDay;
