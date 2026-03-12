/**
 * Timezone-aware gridline computation for Observable Plot charts.
 *
 * Bridges the existing Stratum gridline utilities into Plot-compatible
 * tick arrays and ruleX marks for gridline boundaries.
 */

import { ruleX, axisX } from '@observablehq/plot';
import { getDayStartDates, formatXAxis } from '$lib/components/charts/v2/formatters.js';
import { computeEnergyGridlines } from '$lib/components/charts/v2/energy-gridlines.js';

/**
 * @typedef {Object} PlotGridlines
 * @property {Date[]} ticks - Dates for x-axis label positions
 * @property {(d: any) => string} tickFormat - Formatter for tick labels
 * @property {any[]} gridlineMarks - Observable Plot ruleX marks for gridline boundaries
 */

/**
 * Compute timezone-aware gridlines for an Observable Plot chart.
 *
 * For power mode: day-start gridlines with day labels.
 * For energy mode: smart thinning with centred range labels.
 *
 * @param {any[]} visibleData - Series data with `time` and `date` properties
 * @param {number} viewStart - Viewport start (ms)
 * @param {number} viewEnd - Viewport end (ms)
 * @param {string} ianaTimeZone - e.g. 'Australia/Brisbane'
 * @param {string} timeZone - offset string, e.g. '+10:00'
 * @param {boolean} isEnergy - true for energy mode, false for power
 * @returns {PlotGridlines}
 */
export function computePlotGridlines(
	visibleData,
	viewStart,
	viewEnd,
	ianaTimeZone,
	timeZone,
	isEnergy
) {
	if (!visibleData?.length) {
		return { ticks: [], tickFormat: () => '', gridlineMarks: [] };
	}

	if (isEnergy && visibleData.length > 1) {
		const g = computeEnergyGridlines(visibleData, viewStart, viewEnd, ianaTimeZone);
		return {
			ticks: g.ticks,
			tickFormat: g.formatTick,
			gridlineMarks: [
				ruleX(g.gridlineTicks, {
					stroke: '#e5e5e5',
					strokeWidth: 0.5
				}),
				// Tick marks at boundaries (no labels)
				axisX({
					anchor: 'bottom',
					ticks: g.gridlineTicks,
					tickFormat: () => '',
					tickSize: 6
				}),
				// Labels at midpoints (no tick marks)
				axisX({
					anchor: 'bottom',
					ticks: g.ticks,
					tickFormat: g.formatTick,
					tickSize: 0
				})
			]
		};
	}

	// Power mode: day-start gridlines with midpoint labels
	const dayStarts = getDayStartDates(visibleData, ianaTimeZone, timeZone);

	// Compute midpoints between consecutive day starts for centred labels
	const DAY_MS = 86_400_000;
	/** @type {Date[]} */
	const midpoints = [];
	/** @type {Map<number, Date>} */
	const midToDay = new Map();

	for (let i = 0; i < dayStarts.length; i++) {
		const start = dayStarts[i];
		const end = dayStarts[i + 1] || new Date(start.getTime() + DAY_MS);
		const mid = new Date((start.getTime() + end.getTime()) / 2);
		midpoints.push(mid);
		midToDay.set(mid.getTime(), start);
	}

	/** @type {(d: any) => string} */
	const labelFormatter = (/** @type {any} */ d) => {
		const date = d instanceof Date ? d : new Date(d);
		const dayStart = midToDay.get(date.getTime());
		return formatXAxis(dayStart || date, ianaTimeZone);
	};

	return {
		ticks: midpoints,
		tickFormat: labelFormatter,
		gridlineMarks: [
			// Gridlines at day boundaries
			ruleX(dayStarts, {
				stroke: '#e5e5e5',
				strokeWidth: 0.5
			}),
			// Tick marks at boundaries (no labels)
			axisX({
				anchor: 'bottom',
				ticks: dayStarts,
				tickFormat: () => '',
				tickSize: 6
			}),
			// Labels at midpoints (no tick marks)
			axisX({
				anchor: 'bottom',
				ticks: midpoints,
				tickFormat: labelFormatter,
				tickSize: 0
			})
		]
	};
}
