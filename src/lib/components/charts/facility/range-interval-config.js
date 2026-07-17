import { POWER_THRESHOLD } from '$lib/utils/metric-interval';

/**
 * Range + interval configuration for the facility charts — the single source of
 * truth for the range presets, which intervals each range exposes, and how each
 * interval maps to a native OE API fetch + optional render-layer aggregation.
 *
 * Design: `ChartDataManager` only ever fetches a *native* OE interval
 * (`apiInterval`); coarser user-facing intervals (30m, season, half, fy) are
 * aggregated client-side from the nearest native grain (`aggregate`). The
 * constrained per-range option lists keep wide ranges fetching at a coarse grain
 * (one request) instead of fetching 5m and aggregating.
 *
 * @typedef {Object} IntervalSpec
 * @property {'power' | 'energy'} metric
 * @property {string} apiInterval - native OE interval the data is fetched at
 * @property {string | null} aggregate - render-layer aggregation kind, or null when the fetch grain already matches
 * @property {'straight' | 'step'} curveType
 * @property {string} label
 */

/** @type {Record<string, IntervalSpec>} */
export const INTERVAL_SPEC = {
	'5m': {
		metric: 'power',
		apiInterval: '5m',
		aggregate: null,
		curveType: 'straight',
		label: '5 min'
	},
	'30m': {
		metric: 'power',
		apiInterval: '5m',
		aggregate: '30m',
		curveType: 'straight',
		label: '30 min'
	},
	'1h': {
		metric: 'energy',
		apiInterval: '1h',
		aggregate: null,
		curveType: 'step',
		label: 'Hourly'
	},
	'1d': { metric: 'energy', apiInterval: '1d', aggregate: null, curveType: 'step', label: 'Daily' },
	'7d': { metric: 'energy', apiInterval: '7d', aggregate: null, curveType: 'step', label: 'Week' },
	'1M': { metric: 'energy', apiInterval: '1M', aggregate: null, curveType: 'step', label: 'Month' },
	season: {
		metric: 'energy',
		apiInterval: '1M',
		aggregate: 'season',
		curveType: 'step',
		label: 'Season'
	},
	quarter: {
		metric: 'energy',
		apiInterval: '3M',
		aggregate: null,
		curveType: 'step',
		label: 'Quarter'
	},
	half: {
		metric: 'energy',
		apiInterval: '1M',
		aggregate: 'half',
		curveType: 'step',
		label: 'Half-Year'
	},
	fy: {
		metric: 'energy',
		apiInterval: '1M',
		aggregate: 'fy',
		curveType: 'step',
		label: 'Fin-Year'
	},
	'1y': { metric: 'energy', apiInterval: '1y', aggregate: null, curveType: 'step', label: 'Year' }
};

/** @type {Array<{ id: string, label: string, days: number }>} */
export const RANGE_PRESETS = [
	{ id: '1D', label: '1D', days: 1 },
	{ id: '3D', label: '3D', days: 3 },
	{ id: '7D', label: '7D', days: 7 },
	{ id: '30D', label: '30D', days: 30 },
	{ id: '1Y', label: '1Y', days: 365 },
	{ id: 'ALL', label: 'All', days: -1 }
];

/**
 * Range id → selectable interval ids + the default (coarse-but-useful so the
 * initial fetch is light).
 * @type {Record<string, { options: string[], default: string }>}
 */
export const RANGE_INTERVALS = {
	'1D': { options: ['5m', '30m'], default: '5m' },
	'3D': { options: ['5m', '30m'], default: '30m' },
	'7D': { options: ['5m', '30m'], default: '30m' },
	'30D': { options: ['1h', '1d'], default: '1d' },
	'1Y': { options: ['1d', '7d', '1M'], default: '1M' },
	ALL: { options: ['1M', 'season', 'quarter', 'half', 'fy', '1y'], default: '1M' }
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/**
 * Zoom-duration limits for a chart viewport. Fine (sub-daily power) grains get
 * a tight window; energy grains span up to a full history. Shared so every
 * component clamping the same page-level viewport (FacilityChart, NetworkChart,
 * the derived-rate providers) enforces identical bounds — divergent copies
 * would let a zoom on one chart produce a viewport its siblings never allow.
 *
 * @param {boolean} fine - Sub-daily grain (5m/1h power-style viewport)
 * @returns {{ minMs: number, maxMs: number }}
 */
export function viewportDurationLimits(fine) {
	return fine
		? { minMs: 1 * HOUR_MS, maxMs: 16 * DAY_MS }
		: { minMs: 5 * DAY_MS, maxMs: 50 * 365 * DAY_MS };
}

/**
 * @param {string} id
 * @returns {IntervalSpec | undefined}
 */
export function getIntervalSpec(id) {
	return INTERVAL_SPEC[id];
}

/**
 * @param {string} presetId
 * @returns {{ options: string[], default: string }}
 */
export function getIntervalsForRange(presetId) {
	return RANGE_INTERVALS[presetId] ?? RANGE_INTERVALS['1Y'];
}

/**
 * @param {string} presetId
 * @returns {string}
 */
export function getDefaultIntervalForRange(presetId) {
	return getIntervalsForRange(presetId).default;
}

/**
 * Find the preset whose `days` matches, for resolving the option list from a
 * day count. `-1` (All) only matches the All preset.
 * @param {number} days
 * @returns {(typeof RANGE_PRESETS)[number] | undefined}
 */
export function getPresetByDays(days) {
	return RANGE_PRESETS.find((p) => p.days === days);
}

/**
 * Interval options + default for a custom (calendar) date range, by bucketing
 * the span into the nearest preset tier. Power intervals (5m/30m) are only
 * offered below POWER_THRESHOLD — wider spans would immediately flip back to
 * energy/1d on the first pan/zoom hysteresis tick, discarding the 5m fetch.
 * @param {number} days
 * @returns {{ options: string[], default: string }}
 */
export function getIntervalOptionsForDays(days) {
	if (days <= 1.5) return RANGE_INTERVALS['1D'];
	if (days <= 5) return RANGE_INTERVALS['3D'];
	if (days < POWER_THRESHOLD) return RANGE_INTERVALS['7D'];
	if (days <= 60) return RANGE_INTERVALS['30D'];
	if (days <= 550) return RANGE_INTERVALS['1Y'];
	return RANGE_INTERVALS['ALL'];
}
