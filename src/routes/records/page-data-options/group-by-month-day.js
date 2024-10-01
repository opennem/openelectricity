import { group, rollup } from 'd3-array';
import { timeDay, timeMonth } from 'd3-time';

/**
 *
 * @param {MilestoneRecord[]} data
 * @returns
 */
function groupByMonthDay(data) {
	return rollup(
		data,
		(/** @type {MilestoneRecord[]} */ d) => {
			const latestTime = d.map((d) => d.time).reduce((a, b) => Math.max(a, b), 0);
			return {
				time: latestTime,
				date: new Date(latestTime),
				records: group(d, (d) => d.record_id)
			};
		},
		(/** @type {MilestoneRecord} */ d) => timeMonth(d.date),
		(/** @type {MilestoneRecord} */ d) => timeDay(d.date)
	);
}

export default groupByMonthDay;
