// in miliseconds
/** @type {Record<string, number>} */
let units = {
	year: 24 * 60 * 60 * 1000 * 365,
	month: (24 * 60 * 60 * 1000 * 365) / 12,
	day: 24 * 60 * 60 * 1000,
	hour: 60 * 60 * 1000,
	minute: 60 * 1000,
	second: 1000
};

/**
 *
 * @param {Date} date
 * @returns
 */
function getRelativeTime(date) {
	// return intlFormatDistance(date, new Date());
	let rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

	let getRelativeTime = (/** @type {Date} */ d1, /** @type {Date} */ d2 = new Date()) => {
		var elapsed = d1.getTime() - d2.getTime();

		// "Math.abs" accounts for both "past" & "future" scenarios
		for (var u in units) {
			let key = /** @type {Intl.RelativeTimeFormatUnit} */ (u);
			if (Math.abs(elapsed) > units[key] || key == 'second')
				return rtf.format(Math.round(elapsed / units[key]), key);
		}
	};

	return getRelativeTime(date);
}

export default getRelativeTime;
