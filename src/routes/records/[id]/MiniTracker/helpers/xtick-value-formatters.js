/** @typedef {(d: Date, timeZone?: string) => string} dateFormatter */

/**
 * @param {Date} d
 * @param {string} [timeZone]
 * @returns {string}
 */
function getQuarter(d, timeZone) {
	let month = new Intl.DateTimeFormat('en-AU', {
		month: 'numeric',
		timeZone
	}).format(d);

	let year = new Intl.DateTimeFormat('en-AU', {
		year: 'numeric',
		timeZone
	}).format(d);

	let quarterString = month === '1' ? 'Q1' : month === '4' ? 'Q2' : month === '7' ? 'Q3' : 'Q4';
	return `${quarterString} ${year}`;
}

/**
 * @param {Date} d
 * @param {string} [timeZone]
 * @returns {string}
 */
function getInterval(d, timeZone) {
	let time = new Intl.DateTimeFormat('en-AU', {
		hour: 'numeric',
		minute: 'numeric',
		timeZone
	}).format(d);

	let date = new Intl.DateTimeFormat('en-AU', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		timeZone
	}).format(d);

	return `${date}, ${time}`;
}

/** @type {Record<string, {ticks: number, format: dateFormatter, formatTick: dateFormatter}>} */
let xTickValueFormatters = {
	interval: {
		ticks: 3,
		format: (d, timeZone) => getInterval(d, timeZone),
		formatTick: (d, timeZone) =>
			new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', timeZone }).format(d)
	},
	day: {
		ticks: 4,
		format: (d, timeZone) =>
			new Intl.DateTimeFormat('en-AU', {
				weekday: 'short',
				day: 'numeric',
				month: 'short',
				year: 'numeric',
				timeZone
			}).format(d),
		formatTick: (d, timeZone) =>
			new Intl.DateTimeFormat('en-AU', { month: 'short', year: '2-digit', timeZone }).format(d)
	},
	month: {
		ticks: 3,
		format: (d, timeZone) =>
			new Intl.DateTimeFormat('en-AU', {
				month: 'short',
				year: 'numeric',
				timeZone
			}).format(d),
		formatTick: (d, timeZone) =>
			new Intl.DateTimeFormat('en-AU', { month: 'short', year: '2-digit', timeZone }).format(d)
	},
	quarter: {
		ticks: 4,
		format: (d, timeZone) => getQuarter(d, timeZone),
		formatTick: (d, timeZone) =>
			new Intl.DateTimeFormat('en-AU', { year: 'numeric', timeZone }).format(d)
	},
	year: {
		ticks: 4,
		format: (d, timeZone) =>
			new Intl.DateTimeFormat('en-AU', { year: 'numeric', timeZone }).format(d),
		formatTick: (d, timeZone) =>
			new Intl.DateTimeFormat('en-AU', { year: 'numeric', timeZone }).format(d)
	}
};

export default xTickValueFormatters;
