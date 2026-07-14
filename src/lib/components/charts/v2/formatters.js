/**
 * Date formatters and day-start helpers for facility charts.
 *
 * All functions accept the IANA timezone and offset explicitly so they
 * remain pure and testable.
 */

import { computeEnergyGridlines } from './energy-gridlines.js';
import { cachedFormatter, formatDayMonth } from './date-labels.js';
import { getTimeFormatPolicy } from './time-format-policy.js';
import { ianaFromOffset, offsetHoursFromOffset, offsetMsFromOffset } from './network-time.js';
import { perfSpan } from './perf.js';

// Label primitives live in date-labels.js; re-exported here so existing
// consumers (v2/index.js, facility components, tests) keep their imports.
export {
	formatBucketLabel,
	formatDateRange,
	formatDayMonth as formatXAxis
} from './date-labels.js';

/**
 * Format the hovered point's timestamp for a tooltip header.
 *
 * Unlike the axis tick formatter (which is keyed to gridline midpoints and
 * returns '' for arbitrary points), this always renders a full, readable date
 * for the exact point. Thin wrapper over the interval policy in
 * time-format-policy.js.
 *
 * @param {Date | number} d
 * @param {string} ianaTimeZone - e.g. 'Australia/Brisbane'
 * @param {string} displayInterval - '5m' | '30m' | '1h' | '1d' | '7d' | '1M' | '3M' | 'quarter' | 'season' | 'half' | 'fy' | '1y'
 * @returns {string}
 */
export function formatTooltipDateTime(d, ianaTimeZone, displayInterval) {
	if (!(d instanceof Date) && typeof d !== 'number') return '';
	return getTimeFormatPolicy(displayInterval, ianaTimeZone).formatTooltip(d);
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
 * @returns {{ ticks: Date[], formatTick: (d: any) => string, formatKey: string }}
 *   `formatKey` identifies the formatter (branch + zones) so callers can skip
 *   reassigning an equivalent `formatTick` — the branch rule lives here, not
 *   in the callers.
 */
export function getPowerAxisTicks(viewStart, viewEnd, ianaTimeZone, timeZone, data) {
	const HOUR_MS = 60 * 60 * 1000;
	const DAY_MS = 24 * HOUR_MS;
	const spanHours = (viewEnd - viewStart) / HOUR_MS;

	// Wide power view (> 2 days): keep day-start ticks.
	if (!(spanHours > 0) || spanHours > 48) {
		const dayStarts = getDayStartDates(data, ianaTimeZone, timeZone);
		return {
			ticks: dayStarts,
			formatTick: (/** @type {any} */ d) => formatDayMonth(d, ianaTimeZone),
			formatKey: `day|${ianaTimeZone}`
		};
	}

	// Pick an hour step that yields a readable number of ticks (~4–8).
	const stepHours = spanHours <= 6 ? 1 : spanHours <= 12 ? 2 : spanHours <= 24 ? 3 : 6;
	const stepMs = stepHours * HOUR_MS;
	const offsetMs = offsetMsFromOffset(timeZone);

	// Align ticks to local step boundaries.
	const startLocal = Math.ceil((viewStart + offsetMs) / stepMs) * stepMs;
	const endLocal = viewEnd + offsetMs;
	/** @type {Date[]} */
	const ticks = [];
	for (let localMs = startLocal; localMs <= endLocal; localMs += stepMs) {
		ticks.push(new Date(localMs - offsetMs));
	}

	const timeFmt = cachedFormatter('tick-time', ianaTimeZone, {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true
	});

	/** @param {any} d */
	const formatTick = (d) => {
		const date = d instanceof Date ? d : new Date(d);
		const localMs = date.getTime() + offsetMs;
		// At local midnight, label the date instead of "12:00 am".
		if (((localMs % DAY_MS) + DAY_MS) % DAY_MS === 0) return formatDayMonth(date, ianaTimeZone);
		return timeFmt.format(date);
	};

	return { ticks, formatTick, formatKey: `time|${ianaTimeZone}|${timeZone}` };
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
 * @param {string} opts.displayInterval - '5m' | '30m' | '1h' | '1d' | '7d' | '1M' | '3M' | 'quarter' | 'season' | 'half' | 'fy' | '1y'
 */
export function applyFacilityTimeAxis(
	store,
	{ data, viewStart, viewEnd, ianaTimeZone, timeZone, isEnergy, displayInterval }
) {
	perfSpan('chart:time-axis', () => {
		let memo = timeAxisMemos.get(store);
		if (!memo) {
			memo = {};
			timeAxisMemos.set(store, memo);
		}

		// The tooltip formatter depends only on the interval policy — reassigning
		// a fresh closure per viewport tick would needlessly notify dependants.
		const policyKey = `${displayInterval}|${ianaTimeZone}`;
		if (memo.policyKey !== policyKey) {
			memo.policyKey = policyKey;
			memo.policy = getTimeFormatPolicy(displayInterval, ianaTimeZone);
			const policy = memo.policy;
			store.formatTooltipX = (/** @type {any} */ d) => policy.formatTooltip(d);
		}
		const policy = memo.policy;

		if (isEnergy && data.length > 1) {
			// The energy tick formatter captures data-derived midpoint maps, so it
			// can only be reused when every input is unchanged (common for effect
			// re-runs triggered by other dependencies).
			const energyKey = `${viewStart}|${viewEnd}|${policyKey}`;
			if (memo.tickSource === 'energy' && memo.energyKey === energyKey && memo.energyData === data)
				return;
			memo.tickSource = 'energy';
			memo.energyKey = energyKey;
			memo.energyData = data;
			memo.powerFormatKey = undefined;

			// Coarse calendar buckets (season/quarter/half/fy/1y) don't align to the
			// Jan/month gridlines the inference assumes — the policy supplies an
			// explicit bucket labeller for them.
			const g = computeEnergyGridlines(data, viewStart, viewEnd, ianaTimeZone, policy.bucketTick);
			store.xGridlineTicks = g.gridlineTicks;
			store.xTicks = g.ticks;
			store.formatTickX = g.formatTick;
			memo.lastTicks = g.ticks;
		} else if (data.length > 0) {
			// Power mode: time ticks when zoomed in, day-start ticks otherwise.
			// Compare against the memo, never the store — reading a store field the
			// effect later writes would make every calling effect self-invalidate
			// and run twice per viewport tick.
			const ax = getPowerAxisTicks(viewStart, viewEnd, ianaTimeZone, timeZone, data);
			if (memo.tickSource !== 'power' || !sameTickDates(memo.lastTicks, ax.ticks)) {
				store.xTicks = ax.ticks;
				store.xGridlineTicks = ax.ticks;
				memo.lastTicks = ax.ticks;
			}
			memo.tickSource = 'power';
			memo.energyKey = undefined;
			memo.energyData = undefined;
			// The power formatters depend only on the branch and zones — the
			// identity comes from getPowerAxisTicks, which owns the branch rule.
			if (memo.powerFormatKey !== ax.formatKey) {
				memo.powerFormatKey = ax.formatKey;
				store.formatTickX = ax.formatTick;
			}
		}
	});
}

/**
 * Per-store memo of the last-applied axis state so unchanged viewport effects
 * don't churn tick arrays and formatter closures. WeakMap-keyed on the store
 * so retired ChartStores don't leak.
 * @type {WeakMap<any, any>}
 */
const timeAxisMemos = new WeakMap();

/**
 * Two tick arrays render identically when they have the same length and the
 * same first/last instants (ticks are monotonic sequences generated from the
 * same rules, so the interior follows from the endpoints).
 *
 * @param {Date[] | undefined} a
 * @param {Date[]} b
 * @returns {boolean}
 */
function sameTickDates(a, b) {
	if (a === b) return true;
	if (!Array.isArray(a) || a.length !== b.length) return false;
	if (b.length === 0) return true;
	return (
		a[0].getTime() === b[0].getTime() && a[a.length - 1].getTime() === b[b.length - 1].getTime()
	);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Get the start of the day in the facility's timezone, returned as a UTC Date.
 *
 * @param {Date} date
 * @param {string} ianaTimeZone - e.g. 'Australia/Brisbane'
 * @param {string} timeZone     - offset string, e.g. '+10:00'
 * @returns {Date}
 */
export function getStartOfDay(date, ianaTimeZone, timeZone) {
	// The zones network-time.js maps offsets onto don't observe DST, so when
	// the pair is consistent a local day start is pure offset arithmetic — no
	// Intl needed. Anything else falls back to a (cached) Intl.DateTimeFormat.
	// getStartOfDay runs per visible row on wide power windows.
	if (ianaFromOffset(timeZone) === ianaTimeZone) {
		const offsetMs = offsetMsFromOffset(timeZone);
		return new Date(Math.floor((date.getTime() + offsetMs) / DAY_MS) * DAY_MS - offsetMs);
	}

	const parts = cachedFormatter('ymd2', ianaTimeZone, {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(date);
	const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0');
	const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0') - 1;
	const day = parseInt(parts.find((p) => p.type === 'day')?.value || '0');

	const offsetHours = offsetHoursFromOffset(timeZone);
	return new Date(Date.UTC(year, month, day, -offsetHours, 0, 0, 0));
}

/**
 * Memo for `getDayStartDates`, keyed on the rows array — the axis path
 * recomputes it on every viewport tick, and multi-chart pages alternate
 * between one stable rows array per chart, so a single shared slot would
 * thrash. WeakMap-keyed so retired arrays don't leak.
 * @type {WeakMap<any[], { iana: string, tz: string, result: Date[] }>}
 */
const dayStartsMemos = new WeakMap();

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

	const memo = dayStartsMemos.get(data);
	if (memo && memo.iana === ianaTimeZone && memo.tz === timeZone) {
		return memo.result;
	}

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

	result.sort((a, b) => a.getTime() - b.getTime());
	dayStartsMemos.set(data, { iana: ianaTimeZone, tz: timeZone, result });
	return result;
}
