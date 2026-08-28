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
 * @property {string} unitDenominator - Singular bucket label used in quantity units
 */

/** @type {Record<string, IntervalSpec>} */
export const INTERVAL_SPEC = {
	'5m': {
		metric: 'power',
		apiInterval: '5m',
		aggregate: null,
		curveType: 'straight',
		label: '5 min',
		unitDenominator: '5 min'
	},
	'30m': {
		metric: 'power',
		apiInterval: '5m',
		aggregate: '30m',
		curveType: 'straight',
		label: '30 min',
		unitDenominator: '30 min'
	},
	'1h': {
		metric: 'energy',
		apiInterval: '1h',
		aggregate: null,
		curveType: 'step',
		label: 'Hourly',
		unitDenominator: 'hour'
	},
	'1d': {
		metric: 'energy',
		apiInterval: '1d',
		aggregate: null,
		curveType: 'step',
		label: 'Daily',
		unitDenominator: 'day'
	},
	'7d': {
		metric: 'energy',
		apiInterval: '7d',
		aggregate: null,
		curveType: 'step',
		label: 'Week',
		unitDenominator: 'week'
	},
	'1M': {
		metric: 'energy',
		apiInterval: '1M',
		aggregate: null,
		curveType: 'step',
		label: 'Month',
		unitDenominator: 'month'
	},
	// All rolling variants use monthly source data; the display transform chooses
	// how often the trailing window is sampled.
	'12mr': {
		metric: 'energy',
		apiInterval: '1M',
		aggregate: '12mr',
		curveType: 'step',
		label: '12-Mth Rolling (Month)',
		unitDenominator: '12 months'
	},
	'12mr-season': {
		metric: 'energy',
		apiInterval: '1M',
		aggregate: '12mr-season',
		curveType: 'step',
		label: '12-Mth Rolling (Season)',
		unitDenominator: '12 months'
	},
	'12mr-quarter': {
		metric: 'energy',
		apiInterval: '1M',
		aggregate: '12mr-quarter',
		curveType: 'step',
		label: '12-Mth Rolling (Quarter)',
		unitDenominator: '12 months'
	},
	'12mr-half': {
		metric: 'energy',
		apiInterval: '1M',
		aggregate: '12mr-half',
		curveType: 'step',
		label: '12-Mth Rolling (Half-Year)',
		unitDenominator: '12 months'
	},
	season: {
		metric: 'energy',
		apiInterval: '1M',
		aggregate: 'season',
		curveType: 'step',
		label: 'Season',
		unitDenominator: 'season'
	},
	quarter: {
		metric: 'energy',
		apiInterval: '3M',
		aggregate: null,
		curveType: 'step',
		label: 'Quarter',
		unitDenominator: 'quarter'
	},
	half: {
		metric: 'energy',
		apiInterval: '1M',
		aggregate: 'half',
		curveType: 'step',
		label: 'Half-Year',
		unitDenominator: 'half-year'
	},
	fy: {
		metric: 'energy',
		apiInterval: '1M',
		aggregate: 'fy',
		curveType: 'step',
		label: 'Fin-Year',
		unitDenominator: 'financial year'
	},
	'1y': {
		metric: 'energy',
		apiInterval: '1y',
		aggregate: null,
		curveType: 'step',
		label: 'Year',
		unitDenominator: 'year'
	}
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

/** Rolling is opt-in because other chart summaries assume non-overlapping rows. */
/** @type {Record<string, { options: string[], default: string }>} */
const RANGE_INTERVALS_ROLLING = {
	...RANGE_INTERVALS,
	'1Y': { options: ['1d', '7d', '1M', '12mr'], default: '1M' },
	ALL: {
		options: [
			'1M',
			'12mr',
			'season',
			'12mr-season',
			'quarter',
			'12mr-quarter',
			'half',
			'12mr-half',
			'fy',
			'1y'
		],
		default: '1M'
	}
};

/**
 * @param {boolean} includeRolling
 * @returns {Record<string, { options: string[], default: string }>}
 */
function tierTable(includeRolling) {
	return includeRolling ? RANGE_INTERVALS_ROLLING : RANGE_INTERVALS;
}

/** Base display grain → rolling counterpart. */
const ROLLING_BY_BASE = {
	'1M': '12mr',
	season: '12mr-season',
	quarter: '12mr-quarter',
	half: '12mr-half'
};
const BASE_BY_ROLLING = Object.fromEntries(
	Object.entries(ROLLING_BY_BASE).map(([base, rolling]) => [rolling, base])
);

/**
 * @param {string} id
 * @returns {boolean} Whether the id is a 12-month rolling display interval.
 */
export function isRollingInterval(id) {
	return Object.hasOwn(BASE_BY_ROLLING, id);
}

/**
 * @param {string} baseId
 * @returns {string | null} The rolling counterpart of a base grain, if any.
 */
export function rollingIntervalFor(baseId) {
	return ROLLING_BY_BASE[/** @type {keyof typeof ROLLING_BY_BASE} */ (baseId)] ?? null;
}

/**
 * @param {string} id
 * @returns {string | null} The base grain of a rolling id, or null for non-rolling ids.
 */
export function baseIntervalFor(id) {
	return BASE_BY_ROLLING[id] ?? null;
}

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
 * Label a per-bucket quantity with the selected display interval.
 * @param {string} baseUnit
 * @param {string} intervalId
 * @returns {string}
 */
export function formatIntervalQuantityUnit(baseUnit, intervalId) {
	const denominator = getIntervalSpec(intervalId)?.unitDenominator;
	return denominator ? `${baseUnit}/${denominator}` : baseUnit;
}

/**
 * @param {string} presetId
 * @param {{ includeRolling?: boolean }} [options]
 * @returns {{ options: string[], default: string }}
 */
export function getIntervalsForRange(presetId, { includeRolling = false } = {}) {
	const table = tierTable(includeRolling);
	return table[presetId] ?? table['1Y'];
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
 * @param {{ includeRolling?: boolean }} [options]
 * @returns {{ options: string[], default: string }}
 */
export function getIntervalOptionsForDays(days, { includeRolling = false } = {}) {
	const table = tierTable(includeRolling);
	if (days <= 1.5) return table['1D'];
	if (days <= 5) return table['3D'];
	if (days < POWER_THRESHOLD) return table['7D'];
	if (days <= 60) return table['30D'];
	if (days <= 550) return table['1Y'];
	return table['ALL'];
}
