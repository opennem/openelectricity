import { group, rollup } from 'd3-array';
import { getFormattedDate } from '$lib/utils/formatters';
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
			const isWem = d[0].network_id === 'WEM';
			const timeZone = isWem ? '+08:00' : '+10:00';
			return {
				time: latestTime,
				date: getFormattedDate(
					new Date(latestTime),
					'short',
					'numeric',
					'short',
					undefined,
					timeZone
				),
				timeZone,
				records: group(intervalDayRecords, (r) => r.record_id),
				nonIntervalDayRecords: nonIntervalDayRecords
			};
		},

		(/** @type {MilestoneRecord} */ d) => {
			// console.log('getFormattedMonth', d);
			return new Intl.DateTimeFormat('en-AU', {
				month: 'short',
				year: 'numeric',
				timeZone: d.timeZone
			}).format(d.time);
		},
		(/** @type {MilestoneRecord} */ d) => {
			// console.log('rolled day', d);
			return new Intl.DateTimeFormat('en-AU', {
				weekday: 'short',
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				timeZone: d.timeZone
			}).format(d.time);
		}
	);
}

export default groupByMonthDay;
