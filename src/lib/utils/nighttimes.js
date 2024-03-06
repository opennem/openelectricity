import { addHours, subDays, isBefore, addDays } from 'date-fns';
import { zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz';
/**
 *
 * @param {Date} start
 * @param {Date} end
 * @returns {Date[][]}
 */
export default function (start, end) {
	const nighttimes = [];

	let dStart = subDays(start, 1);

	while (isBefore(dStart, end)) {
		const formattedStart = formatInTimeZone(dStart, '+10:00', 'yyyy-MM-dd 22:00:00');
		const startTime = zonedTimeToUtc(formattedStart, '+10:00');
		const endTime = addHours(startTime, 9);
		nighttimes.push([startTime, endTime]);
		dStart = addDays(dStart, 1);
	}

	return nighttimes;
}
