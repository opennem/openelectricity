import { isBefore, addDays } from 'date-fns';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
/**
 *
 * @param {Date | number | undefined} start
 * @param {Date | number | undefined} end
 * @returns {Date[]}
 */
export default function (start, end) {
	if (!start || !end) return [];

	const ticks = [];

	let dStart = new Date(start);
	let dEnd = new Date(end);

	while (isBefore(dStart, dEnd)) {
		const formattedStart = formatInTimeZone(dStart, '+10:00', 'yyyy-MM-dd');
		const startTime = fromZonedTime(formattedStart, '+10:00');
		ticks.push(startTime);
		dStart = addDays(dStart, 1);
	}

	const formattedStart = formatInTimeZone(dStart, '+10:00', 'yyyy-MM-dd');
	const startTime = fromZonedTime(formattedStart, '+10:00');
	ticks.push(startTime);

	return ticks;
}
