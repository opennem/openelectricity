// Array representing one minute, hour, day, week, month, etc. in seconds
const unitsInSec = [60, 3600, 86400, 86400 * 7, 86400 * 30, 86400 * 365, Infinity];

// Array equivalent to the above but in the string representation of the units
const unitStrings = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'];

function getRelativeTime(date, style = 'short') {
	// Initialize Intl.RelativeTimeFormat
	const rtf = new Intl.RelativeTimeFormat('en-AU', { numeric: 'auto', style });

	// Calculate the difference in seconds between the given date and the current date
	const secondsDiff = Math.round((date - Date.now()) / 1000);

	// Find the appropriate unit based on the seconds difference
	const unitIndex = unitsInSec.findIndex((cutoff) => cutoff > Math.abs(secondsDiff));

	// Get the divisor to convert seconds to the appropriate unit
	const divisor = unitIndex ? unitsInSec[unitIndex - 1] : 1;

	return rtf.format(Math.floor(secondsDiff / divisor), unitStrings[unitIndex]);
}

export default getRelativeTime;
