/**
 * Energy gridline computation for facility charts.
 *
 * Builds thinned gridlines, centered label ticks, and a tick formatter
 * from a set of visible energy data points. All pure — no reactive deps.
 */

import { cachedFormatter, formatDayMonth, formatDateRange } from './date-labels.js';

const DAY_MS = 24 * 60 * 60 * 1000;

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
 * @param {((d: Date) => string) | null} [coarseLabel] - When set, the data is in
 *        coarse calendar buckets (season/quarter/half/fy); label one tick per
 *        bucket with this fn and skip the Jan/month-aligned gridline inference.
 * @returns {EnergyGridlines}
 */
export function computeEnergyGridlines(
	visibleData,
	viewStart,
	viewEnd,
	ianaTimeZone,
	coarseLabel = null
) {
	/** @type {Date[]} */
	const dataStarts = visibleData.map((/** @type {any} */ d) => new Date(d.time));

	// Coarse calendar buckets (season/quarter/half/fy): one gridline per kept
	// bucket start, thinned to ~12 labels. Labels are keyed to band midpoints —
	// same convention as the branches below — so they sit centred over the band
	// instead of straddling the boundary gridline.
	if (coarseLabel) {
		const skip = Math.max(1, Math.ceil(dataStarts.length / 12));
		const starts = dataStarts.filter((_, i) => i % skip === 0);
		const bucketMs =
			dataStarts.length > 1 ? dataStarts[1].getTime() - dataStarts[0].getTime() : 90 * DAY_MS;
		const { midpoints, midToStart } = bandMidpoints(starts, bucketMs * skip);

		return {
			gridlineTicks: starts,
			ticks: midpoints,
			formatTick: (/** @type {any} */ d) => {
				const time = d instanceof Date ? d.getTime() : new Date(d).getTime();
				const bucketStart = midToStart.get(time);
				return bucketStart ? coarseLabel(bucketStart) : '';
			}
		};
	}

	// Detect the data grain from the first two points.
	const bandMsEst =
		dataStarts.length > 1 ? dataStarts[1].getTime() - dataStarts[0].getTime() : DAY_MS;
	const isMonthlyInterval = bandMsEst > 20 * DAY_MS;
	const isWeeklyInterval = !isMonthlyInterval && bandMsEst > 6 * DAY_MS;

	// Viewport duration in years — used for yearly gridline snapping
	const viewportDays = (viewEnd - viewStart) / DAY_MS;
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
	} else if (isWeeklyInterval) {
		// Weekly buckets: thin by whole weeks — the daily tiers below would
		// turn a year of weekly points into 14-week bands.
		if (numPoints <= 16) skip = 1;
		else if (numPoints <= 32) skip = 2;
		else if (numPoints <= 64) skip = 4;
		else skip = 8;
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
	const ymFmt = cachedFormatter('ym2', ianaTimeZone, { year: 'numeric', month: '2-digit' });

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

	// Estimated width of one thinned band, for the final band's end.
	const skipBandMs = useYearlyGridlines ? 365 * DAY_MS : bandMsEst * skip;
	const { midpoints, midToStart, midToEnd } = bandMidpoints(thinnedGridlines, skipBandMs);

	// ── Formatter ────────────────────────────────────────────────

	/** @type {(d: any) => string} */
	let formatTick;

	if (useYearlyGridlines) {
		const yearFmt = cachedFormatter('y', ianaTimeZone, { year: 'numeric' });
		formatTick = (/** @type {any} */ d) => {
			const date = d instanceof Date ? d : new Date(d);
			const rangeStart = midToStart.get(date.getTime());
			if (!rangeStart) return '';
			return yearFmt.format(rangeStart);
		};
	} else if (isMonthlyInterval || skip >= 28) {
		const myfmt = cachedFormatter('my2', ianaTimeZone, { month: 'short', year: '2-digit' });
		const monthNumFmt = cachedFormatter('mn', ianaTimeZone, { month: 'numeric' });

		formatTick = (/** @type {any} */ d) => {
			const date = d instanceof Date ? d : new Date(d);
			const rangeStart = midToStart.get(date.getTime()) || date;
			const rangeEnd = midToEnd.get(date.getTime());

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
			if (!rangeStart || !rangeEnd) return formatDayMonth(date, ianaTimeZone);

			if (rangeStart.getTime() === rangeEnd.getTime()) {
				return formatDayMonth(rangeStart, ianaTimeZone);
			}
			return formatDateRange(rangeStart, rangeEnd, ianaTimeZone);
		};
	}

	return {
		gridlineTicks: thinnedGridlines,
		ticks: midpoints,
		formatTick
	};
}

/**
 * Centre a label tick in each band between consecutive band starts, keyed so
 * a formatter can resolve the band from the midpoint timestamp. The final
 * band's end is estimated from `lastBandMs`.
 *
 * `midToEnd` holds the inclusive band end: the day before the next band
 * starts. (Subtracting a full bucket width instead would mislabel weekly
 * bands — and, for 31-day estimates, could land single-month bands in the
 * prior month.)
 *
 * @param {Date[]} bandStarts
 * @param {number} lastBandMs
 * @returns {{ midpoints: Date[], midToStart: Map<number, Date>, midToEnd: Map<number, Date> }}
 */
function bandMidpoints(bandStarts, lastBandMs) {
	/** @type {Date[]} */
	const midpoints = [];
	/** @type {Map<number, Date>} */
	const midToStart = new Map();
	/** @type {Map<number, Date>} */
	const midToEnd = new Map();

	for (let i = 0; i < bandStarts.length; i++) {
		const bandStart = bandStarts[i];
		const bandEnd = bandStarts[i + 1] || new Date(bandStart.getTime() + lastBandMs);
		const mid = new Date((bandStart.getTime() + bandEnd.getTime()) / 2);
		midpoints.push(mid);
		midToStart.set(mid.getTime(), bandStart);
		midToEnd.set(mid.getTime(), new Date(bandEnd.getTime() - DAY_MS));
	}

	return { midpoints, midToStart, midToEnd };
}
