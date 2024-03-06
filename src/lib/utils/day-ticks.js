import { addHours, subDays, isBefore, addDays } from 'date-fns';
import { zonedTimeToUtc, formatInTimeZone } from 'date-fns-tz';
/**
 *
 * @param {Date} start
 * @param {Date} end
 * @returns {Date[]}
 */
export default function (start, end) {
	const ticks = [];

	let dStart = start;

	while (isBefore(dStart, end)) {
		const formattedStart = formatInTimeZone(dStart, '+10:00', 'yyyy-MM-dd');
		const startTime = zonedTimeToUtc(formattedStart, '+10:00');
		ticks.push(startTime);
		dStart = addDays(dStart, 1);
	}

	const formattedStart = formatInTimeZone(dStart, '+10:00', 'yyyy-MM-dd');
	const startTime = zonedTimeToUtc(formattedStart, '+10:00');
	ticks.push(startTime);

	return ticks;
}
