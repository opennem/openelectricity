/**
 * Date formatters and day-start helpers for facility charts.
 *
 * All functions accept the IANA timezone and offset explicitly so they
 * remain pure and testable.
 */

import { computeEnergyGridlines } from './energy-gridlines.js';

/**
 * Format a date for X-axis tick labels (day starts only).
 *
 * @param {Date | any} d
 * @param {string} ianaTimeZone - e.g. 'Australia/Brisbane'
 * @returns {string}
 */
export function formatXAxis(d, ianaTimeZone) {
	const date = d instanceof Date ? d : typeof d === 'number' ? new Date(d) : null;
	if (!date) return String(d);

	return new Intl.DateTimeFormat('en-AU', {
		day: 'numeric',
		month: 'short',
		timeZone: ianaTimeZone
	}).format(date);
}

/**
 * Format the hovered point's timestamp for a tooltip header.
 *
 * Unlike the axis tick formatter (which is keyed to gridline midpoints and
 * returns '' for arbitrary points), this always renders a full, readable date
 * for the exact point, adding the time of day for sub-daily (power) intervals.
 *
 * @param {Date | number} d
 * @param {string} ianaTimeZone - e.g. 'Australia/Brisbane'
 * @param {string} displayInterval - '5m' | '30m' | '1h' | '1d' | '1M' | '3M' | '1y'
 * @returns {string}
 */
export function formatTooltipDateTime(d, ianaTimeZone, displayInterval) {
	const date = d instanceof Date ? d : typeof d === 'number' ? new Date(d) : null;
	if (!date || Number.isNaN(date.getTime())) return '';

	/** @type {Intl.DateTimeFormatOptions} */
	let options;
	if (displayInterval === '1y') {
		options = { year: 'numeric' };
	} else if (displayInterval === '1M' || displayInterval === '3M') {
		options = { month: 'short', year: 'numeric' };
	} else if (displayInterval === '5m' || displayInterval === '30m' || displayInterval === '1h') {
		// Sub-daily: include the time of day.
		options = {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		};
	} else {
		// Daily (1d) and anything else: full date, no time.
		options = { day: 'numeric', month: 'short', year: 'numeric' };
	}

	return new Intl.DateTimeFormat('en-AU', { ...options, timeZone: ianaTimeZone }).format(date);
}

/**
 * Compute x-axis ticks + formatter for power-mode (sub-daily) charts.
 *
 * When the visible span is short enough (≤ 2 days) the axis switches from
 * day-start ticks ("21 Jan") to evenly-spaced intra-day time ticks ("2 pm"),
 * with the date shown at local midnight. Wider spans keep the day-start ticks.
 *
 * AEST (+10) and AWST (+08) don't observe DST, so aligning ticks to local
 * hour boundaries via a fixed offset is exact.
 *
 * @param {number} viewStart - Viewport start (ms)
 * @param {number} viewEnd - Viewport end (ms)
 * @param {string} ianaTimeZone - e.g. 'Australia/Brisbane'
 * @param {string} timeZone - offset string, e.g. '+10:00'
 * @param {any[]} data - Series rows (for the wide-span day-start fallback)
 * @returns {{ ticks: Date[], formatTick: (d: any) => string }}
 */
export function getPowerAxisTicks(viewStart, viewEnd, ianaTimeZone, timeZone, data) {
	const HOUR_MS = 60 * 60 * 1000;
	const DAY_MS = 24 * HOUR_MS;
	const spanHours = (viewEnd - viewStart) / HOUR_MS;

	// Wide power view (> 2 days): keep day-start ticks.
	if (!(spanHours > 0) || spanHours > 48) {
		const dayStarts = getDayStartDates(data, ianaTimeZone, timeZone);
		return { ticks: dayStarts, formatTick: (/** @type {any} */ d) => formatXAxis(d, ianaTimeZone) };
	}

	// Pick an hour step that yields a readable number of ticks (~4–8).
	const stepHours = spanHours <= 6 ? 1 : spanHours <= 12 ? 2 : spanHours <= 24 ? 3 : 6;
	const stepMs = stepHours * HOUR_MS;
	const offsetMs = timeZone === '+08:00' ? 8 * HOUR_MS : 10 * HOUR_MS;

	// Align ticks to local step boundaries.
	const startLocal = Math.ceil((viewStart + offsetMs) / stepMs) * stepMs;
	const endLocal = viewEnd + offsetMs;
	/** @type {Date[]} */
	const ticks = [];
	for (let localMs = startLocal; localMs <= endLocal; localMs += stepMs) {
		ticks.push(new Date(localMs - offsetMs));
	}

	const timeFmt = new Intl.DateTimeFormat('en-AU', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
		timeZone: ianaTimeZone
	});
	const dateFmt = new Intl.DateTimeFormat('en-AU', {
		day: 'numeric',
		month: 'short',
		timeZone: ianaTimeZone
	});

	/** @param {any} d */
	const formatTick = (d) => {
		const date = d instanceof Date ? d : new Date(d);
		const localMs = date.getTime() + offsetMs;
		// At local midnight, label the date instead of "12:00 am".
		if (((localMs % DAY_MS) + DAY_MS) % DAY_MS === 0) return dateFmt.format(date);
		return timeFmt.format(date);
	};

	return { ticks, formatTick };
}

/**
 * Format a date range for x-axis labels in step/energy mode.
 *
 * Same month:      "21 — 27 Jan"
 * Different month:  "28 Jan — 3 Feb"
 * Different year:   "28 Dec '25 — 3 Jan '26"
 *
 * @param {Date} start
 * @param {Date} end
 * @param {string} ianaTimeZone
 * @returns {string}
 */
export function formatDateRange(start, end, ianaTimeZone) {
	const partsFmt = new Intl.DateTimeFormat('en-AU', {
		day: 'numeric',
		month: 'short',
		year: '2-digit',
		timeZone: ianaTimeZone
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

/**
 * Apply the standard facility x-axis + tooltip formatting to a chart store.
 *
 * Sets the axis ticks/gridlines and `formatTickX` (energy gridlines, or
 * power-mode day-start/time ticks), plus `formatTooltipX` — the dedicated
 * tooltip formatter that always renders the hovered point's full date/time
 * rather than the terse, midpoint-keyed axis label.
 *
 * @param {any} store - ChartStore instance
 * @param {Object} opts
 * @param {any[]} opts.data - Visible series rows
 * @param {number} opts.viewStart - Viewport start (ms)
 * @param {number} opts.viewEnd - Viewport end (ms)
 * @param {string} opts.ianaTimeZone - e.g. 'Australia/Brisbane'
 * @param {string} opts.timeZone - offset string, e.g. '+10:00'
 * @param {boolean} opts.isEnergy - Whether the chart is in energy (stepped) mode
 * @param {string} opts.displayInterval - '5m' | '30m' | '1d' | '1M' | '3M' | '1y'
 */
export function applyFacilityTimeAxis(
	store,
	{ data, viewStart, viewEnd, ianaTimeZone, timeZone, isEnergy, displayInterval }
) {
	store.formatTooltipX = (/** @type {any} */ d) =>
		formatTooltipDateTime(d, ianaTimeZone, displayInterval);

	if (isEnergy && data.length > 1) {
		const g = computeEnergyGridlines(data, viewStart, viewEnd, ianaTimeZone);
		store.xGridlineTicks = g.gridlineTicks;
		store.xTicks = g.ticks;
		store.formatTickX = g.formatTick;
	} else if (data.length > 0) {
		// Power mode: time ticks when zoomed in, day-start ticks otherwise.
		const ax = getPowerAxisTicks(viewStart, viewEnd, ianaTimeZone, timeZone, data);
		store.xTicks = ax.ticks;
		store.xGridlineTicks = ax.ticks;
		store.formatTickX = ax.formatTick;
	}
}

/**
 * Get the start of the day in the facility's timezone, returned as a UTC Date.
 *
 * @param {Date} date
 * @param {string} ianaTimeZone - e.g. 'Australia/Brisbane'
 * @param {string} timeZone     - offset string, e.g. '+10:00'
 * @returns {Date}
 */
export function getStartOfDay(date, ianaTimeZone, timeZone) {
	const formatter = new Intl.DateTimeFormat('en-AU', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: ianaTimeZone
	});
	const parts = formatter.formatToParts(date);
	const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0');
	const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0') - 1;
	const day = parseInt(parts.find((p) => p.type === 'day')?.value || '0');

	const offsetHours = timeZone === '+08:00' ? 8 : 10;
	return new Date(Date.UTC(year, month, day, -offsetHours, 0, 0, 0));
}

/**
 * Compute day-start dates from series data for power-mode gridlines.
 *
 * @param {any[]} data          - Series data with `date` or `time` property
 * @param {string} ianaTimeZone
 * @param {string} timeZone     - offset string
 * @returns {Date[]}
 */
export function getDayStartDates(data, ianaTimeZone, timeZone) {
	if (!data?.length) return [];

	const dayStarts = new Set();
	/** @type {Date[]} */
	const result = [];

	for (const d of data) {
		const date = d.date || new Date(d.time);
		const dayStart = getStartOfDay(date, ianaTimeZone, timeZone);
		const key = dayStart.getTime();

		if (!dayStarts.has(key)) {
			dayStarts.add(key);
			result.push(dayStart);
		}
	}

	return result.sort((a, b) => a.getTime() - b.getTime());
}
