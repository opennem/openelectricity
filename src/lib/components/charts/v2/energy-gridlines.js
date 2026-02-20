/**
 * Energy gridline computation for facility charts.
 *
 * Builds thinned gridlines, centered label ticks, and a tick formatter
 * from a set of visible energy data points. All pure — no reactive deps.
 */

/**
 * @typedef {Object} EnergyGridlines
 * @property {Date[]} gridlineTicks  - Dates where vertical gridlines should be drawn
 * @property {Date[]} ticks          - Midpoint dates where labels are positioned
 * @property {(d: any) => string} formatTick - Formatter for tick labels
 */

/**
 * Compute gridlines, label ticks, and a formatter for energy mode.
 *
 * @param {any[]} visibleData       - Array of data points with `.time` property (ms)
 * @param {number} viewStart        - Viewport start (ms)
 * @param {number} viewEnd          - Viewport end (ms)
 * @param {string} ianaTimeZone     - IANA timezone (e.g. 'Australia/Brisbane')
 * @returns {EnergyGridlines}
 */
export function computeEnergyGridlines(visibleData, viewStart, viewEnd, ianaTimeZone) {
	/** @type {Date[]} */
	const dataStarts = visibleData.map((/** @type {any} */ d) => new Date(d.time));

	// Detect if data is monthly interval (bandMs > 20 days)
	const bandMsEst =
		dataStarts.length > 1
			? dataStarts[1].getTime() - dataStarts[0].getTime()
			: 24 * 60 * 60 * 1000;
	const isMonthlyInterval = bandMsEst > 20 * 24 * 60 * 60 * 1000;

	// Viewport duration in years — used for yearly gridline snapping
	const viewportDays = (viewEnd - viewStart) / (24 * 60 * 60 * 1000);
	const useYearlyGridlines = viewportDays >= 3 * 365;

	// Smart thinning based on number of data points and interval
	const numPoints = dataStarts.length;
	/** @type {number} */
	let skip;
	if (useYearlyGridlines) {
		skip = isMonthlyInterval ? 12 : 365;
	} else if (isMonthlyInterval) {
		if (numPoints <= 18) skip = 1;
		else if (numPoints <= 24) skip = 3;
		else skip = 6;
	} else {
		if (numPoints <= 14) skip = 1;
		else if (numPoints <= 45) skip = 7;
		else if (numPoints <= 120) skip = 14;
		else if (numPoints <= 400) skip = 30;
		else skip = 90;
	}

	// ── Build gridlines ──────────────────────────────────────────

	/** @type {Date[]} */
	let thinnedGridlines;
	const ymFmt = new Intl.DateTimeFormat('en-AU', {
		year: 'numeric',
		month: '2-digit',
		timeZone: ianaTimeZone
	});

	if (useYearlyGridlines) {
		/** @type {Set<string>} */
		const seenYears = new Set();
		thinnedGridlines = [];
		for (const d of dataStarts) {
			const parts = ymFmt.formatToParts(d);
			const y = parts.find((p) => p.type === 'year')?.value;
			const m = parts.find((p) => p.type === 'month')?.value;
			if (m === '01' && y && !seenYears.has(y)) {
				seenYears.add(y);
				thinnedGridlines.push(d);
			}
		}
	} else if (!isMonthlyInterval && skip >= 28) {
		// Daily data at monthly scale: snap to month boundaries
		/** @type {Set<string>} */
		const seen = new Set();
		/** @type {Date[]} */
		const monthBoundaries = [];
		for (const d of dataStarts) {
			const parts = ymFmt.formatToParts(d);
			const y = parts.find((p) => p.type === 'year')?.value;
			const m = parts.find((p) => p.type === 'month')?.value;
			const key = `${y}-${m}`;
			if (!seen.has(key)) {
				seen.add(key);
				monthBoundaries.push(d);
			}
		}
		const numMonths = monthBoundaries.length;
		if (numMonths > 24) {
			thinnedGridlines = monthBoundaries.filter((_, i) => i % 6 === 0);
			skip = 6 * 30;
		} else if (numMonths > 14) {
			thinnedGridlines = monthBoundaries.filter((_, i) => i % 3 === 0);
			skip = 3 * 30;
		} else {
			thinnedGridlines = monthBoundaries;
			skip = 30;
		}
	} else {
		thinnedGridlines = dataStarts.filter((_, i) => i % skip === 0);
	}

	// ── Midpoints for centred labels ─────────────────────────────

	const bandMs =
		dataStarts.length > 1
			? dataStarts[1].getTime() - dataStarts[0].getTime()
			: 24 * 60 * 60 * 1000;
	const skipBandMs = bandMs * skip;

	/** @type {Date[]} */
	const midpoints = [];
	/** @type {Map<number, Date>} */
	const midToStart = new Map();
	/** @type {Map<number, Date>} */
	const midToEnd = new Map();

	for (let i = 0; i < thinnedGridlines.length; i++) {
		const bandStart = thinnedGridlines[i];
		const bandEnd = thinnedGridlines[i + 1] || new Date(bandStart.getTime() + skipBandMs);
		const mid = new Date((bandStart.getTime() + bandEnd.getTime()) / 2);
		midpoints.push(mid);
		midToStart.set(mid.getTime(), bandStart);
		midToEnd.set(mid.getTime(), new Date(bandEnd.getTime() - bandMs));
	}

	// ── Formatter ────────────────────────────────────────────────

	/** @type {(d: any) => string} */
	let formatTick;

	if (useYearlyGridlines) {
		formatTick = (/** @type {any} */ d) => {
			const date = d instanceof Date ? d : new Date(d);
			const rangeStart = midToStart.get(date.getTime());
			const rangeEnd = midToEnd.get(date.getTime());
			if (!rangeStart) return '';
			const sYear = new Intl.DateTimeFormat('en-AU', {
				year: 'numeric',
				timeZone: ianaTimeZone
			}).format(rangeStart);
			if (!rangeEnd) return sYear;
			const eYear = new Intl.DateTimeFormat('en-AU', {
				year: 'numeric',
				timeZone: ianaTimeZone
			}).format(rangeEnd);
			if (sYear === eYear) return sYear;
			return `${sYear} \u2014 ${eYear}`;
		};
	} else if (isMonthlyInterval || skip >= 28) {
		formatTick = (/** @type {any} */ d) => {
			const date = d instanceof Date ? d : new Date(d);
			const rangeStart = midToStart.get(date.getTime()) || date;
			const rangeEnd = midToEnd.get(date.getTime());

			const myfmt = new Intl.DateTimeFormat('en-AU', {
				month: 'short',
				year: '2-digit',
				timeZone: ianaTimeZone
			});
			const monthNumFmt = new Intl.DateTimeFormat('en-AU', {
				month: 'numeric',
				timeZone: ianaTimeZone
			});

			const sParts = myfmt.formatToParts(rangeStart);
			const sMonth = sParts.find((p) => p.type === 'month')?.value || '';
			const sYear = sParts.find((p) => p.type === 'year')?.value || '';
			const sMonthNum = parseInt(monthNumFmt.format(rangeStart));

			const eMonthNumVal = rangeEnd ? parseInt(monthNumFmt.format(rangeEnd)) : sMonthNum;
			const eYearVal = rangeEnd
				? myfmt.formatToParts(rangeEnd).find((p) => p.type === 'year')?.value
				: sYear;
			if (!rangeEnd || (sMonthNum === eMonthNumVal && sYear === eYearVal)) {
				return sMonthNum === 1 ? `${sMonth} '${sYear}` : sMonth;
			}

			const eParts = myfmt.formatToParts(rangeEnd);
			const eMonth = eParts.find((p) => p.type === 'month')?.value || '';
			const eYear = eParts.find((p) => p.type === 'year')?.value || '';
			const eMonthNum = parseInt(monthNumFmt.format(rangeEnd));

			const hasJan = sMonthNum === 1 || eMonthNum < sMonthNum;

			if (!hasJan) {
				return `${sMonth} \u2014 ${eMonth}`;
			}
			if (sYear !== eYear) {
				return `${sMonth} \u2014 ${eMonth} '${eYear}`;
			}
			return `${sMonth} \u2014 ${eMonth} '${eYear}`;
		};
	} else {
		formatTick = (/** @type {any} */ d) => {
			const date = d instanceof Date ? d : new Date(d);
			const rangeStart = midToStart.get(date.getTime());
			const rangeEnd = midToEnd.get(date.getTime());
			if (!rangeStart || !rangeEnd) return _formatXAxis(date, ianaTimeZone);

			if (rangeStart.getTime() === rangeEnd.getTime()) {
				return _formatXAxis(rangeStart, ianaTimeZone);
			}
			return _formatDateRange(rangeStart, rangeEnd, ianaTimeZone);
		};
	}

	return {
		gridlineTicks: thinnedGridlines,
		ticks: midpoints,
		formatTick
	};
}

// ── Internal helpers (duplicated from formatters.js to keep this module self-contained) ──

/**
 * @param {Date} date
 * @param {string} tz
 * @returns {string}
 */
function _formatXAxis(date, tz) {
	return new Intl.DateTimeFormat('en-AU', {
		day: 'numeric',
		month: 'short',
		timeZone: tz
	}).format(date);
}

/**
 * @param {Date} start
 * @param {Date} end
 * @param {string} tz
 * @returns {string}
 */
function _formatDateRange(start, end, tz) {
	const partsFmt = new Intl.DateTimeFormat('en-AU', {
		day: 'numeric',
		month: 'short',
		year: '2-digit',
		timeZone: tz
	});

	const sParts = partsFmt.formatToParts(start);
	const eParts = partsFmt.formatToParts(end);

	const sDay = sParts.find((p) => p.type === 'day')?.value;
	const eDay = eParts.find((p) => p.type === 'day')?.value;
	const sMonth = sParts.find((p) => p.type === 'month')?.value;
	const eMonth = eParts.find((p) => p.type === 'month')?.value;
	const sYear = sParts.find((p) => p.type === 'year')?.value;
	const eYear = eParts.find((p) => p.type === 'year')?.value;

	if (sYear !== eYear) {
		return `${sDay} ${sMonth} '${sYear} \u2014 ${eDay} ${eMonth} '${eYear}`;
	}
	if (sMonth !== eMonth) {
		return `${sDay} ${sMonth} \u2014 ${eDay} ${eMonth}`;
	}
	return `${sDay} \u2014 ${eDay} ${eMonth}`;
}
