import { addHours, subDays, isBefore, addDays } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
/**
 *
 * @param {Date} start
 * @param {Date} end
 * @param {string} [offset]
 * @returns {Date[][]}
 */
export default function (start, end, offset = '+10:00') {
	const nighttimes = [];

	let dStart = subDays(start, 1);

	while (isBefore(dStart, end)) {
		const formattedStart = formatInTimeZone(dStart, offset, 'yyyy-MM-dd 22:00:00');
		const startTime = fromZonedTime(formattedStart, offset);
		const endTime = addHours(startTime, 9);
		nighttimes.push([startTime, endTime]);
		dStart = addDays(dStart, 1);
	}

	return nighttimes;
}
