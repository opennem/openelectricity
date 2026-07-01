/**
 * Declarative metric definitions for the facility metrics section.
 *
 * Instead of one component per fuel tech (which duplicated ~80% of its logic),
 * each metric is a descriptor with a single `compute(ctx)` that turns the shared
 * metrics context into a `{ value, unit?, subtitle? }` for a `MetricCard`. Each
 * fuel-tech group just names an ordered list of descriptor ids.
 *
 * `ctx` is built once by `FacilityMetrics.svelte` from the visible-range data
 * (so every metric reflects the chart's current date range).
 */

import { getNumberFormat } from '$lib/utils/formatters';

const fmt0 = getNumberFormat(0);
const fmt1 = getNumberFormat(1);
const fmt2 = getNumberFormat(2);

/**
 * Format a dollar revenue compactly: `$Xk` / `$X.Xm`.
 * @param {number} value
 * @returns {string}
 */
function formatRevenue(value) {
	const abs = Math.abs(value);
	const sign = value < 0 ? '-' : '';
	if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}m`;
	if (abs >= 1_000) return `${sign}$${Math.round(abs / 1_000)}k`;
	return `${sign}$${Math.round(abs)}`;
}

/**
 * @typedef {Object} MetricResult
 * @property {string} value
 * @property {string} [label] - Overrides the descriptor's default label (e.g. "Peak Output" ↔ "Peak Energy").
 * @property {string} [unit]
 * @property {string} [subtitle]
 * @property {number} [highlightTime] - When set, hovering/focusing the cell annotates the chart at this time (ms).
 */

/**
 * @typedef {Object} MetricsContext
 * @property {boolean} hasSummary
 * @property {boolean} hasEmissions
 * @property {boolean} hasSubDaily
 * @property {number} totalCapacity
 * @property {number} totalEnergy
 * @property {number} totalMV
 * @property {number} capacityFactor
 * @property {number} avgPrice
 * @property {{ value: number, time: number, isPower: boolean, periodLabel: string } | null} peak
 * @property {number} totalEmissions
 * @property {number | null} emissionsIntensity
 * @property {number} runningHours
 * @property {number} startCount
 * @property {number} netRevenue
 * @property {number | null} roundTripEfficiency
 * @property {number | null} storageDuration
 * @property {{ ratio: number } | null} dcAc
 */

const NEEDS_INTERVAL = 'Requires interval data';

/** @type {Record<string, { label: string, compute: (ctx: MetricsContext) => MetricResult }>} */
export const METRICS = {
	capacityFactor: {
		label: 'Capacity Factor',
		compute: (c) =>
			c.hasSummary ? { value: fmt1.format(c.capacityFactor), unit: '%' } : { value: '--' }
	},
	totalEnergy: {
		label: 'Total Energy',
		compute: (c) =>
			c.hasSummary ? { value: fmt0.format(c.totalEnergy), unit: 'MWh' } : { value: '--' }
	},
	revenue: {
		label: 'Revenue',
		compute: (c) => (c.hasSummary ? { value: formatRevenue(c.totalMV) } : { value: '--' })
	},
	avgPrice: {
		label: 'Avg Price Received',
		compute: (c) =>
			c.hasSummary ? { value: fmt2.format(c.avgPrice), unit: '$/MWh' } : { value: '--' }
	},
	co2: {
		label: 'CO₂ Emissions',
		compute: (c) =>
			c.hasEmissions
				? { value: fmt0.format(c.totalEmissions), unit: 'tCO₂' }
				: { value: '--', subtitle: 'No emissions data' }
	},
	intensity: {
		label: 'Emissions Intensity',
		compute: (c) =>
			c.emissionsIntensity != null
				? { value: fmt0.format(c.emissionsIntensity), unit: 'kgCO₂e/MWh' }
				: { value: '--' }
	},
	peak: {
		// Power-mode label; energy mode overrides it to "Peak Energy" below. Each
		// shows the period of the peak as a subtitle and annotates the chart on hover.
		label: 'Peak Output',
		compute: (c) => {
			const p = c.peak;
			if (!p) return { value: '--' };
			const base = { subtitle: p.periodLabel, highlightTime: p.time };
			return p.isPower
				? {
						...base,
						value: `${fmt0.format(p.value)} / ${fmt0.format(c.totalCapacity)}`,
						unit: 'MW'
					}
				: { ...base, label: 'Peak Energy', value: fmt0.format(p.value), unit: 'MWh' };
		}
	},
	runningHours: {
		label: 'Running Hours',
		compute: (c) =>
			c.hasSubDaily
				? { value: fmt0.format(c.runningHours), unit: 'h' }
				: { value: '--', subtitle: NEEDS_INTERVAL }
	},
	startCount: {
		label: 'Start Count',
		compute: (c) =>
			c.hasSubDaily
				? { value: fmt0.format(c.startCount) }
				: { value: '--', subtitle: NEEDS_INTERVAL }
	},
	netRevenue: {
		label: 'Net Revenue',
		compute: (c) =>
			c.hasSummary
				? {
						value: formatRevenue(c.netRevenue),
						subtitle: 'Energy arbitrage only — FCAS not included'
					}
				: { value: '--' }
	},
	storageDuration: {
		label: 'Storage Duration',
		compute: (c) =>
			c.storageDuration != null
				? { value: fmt1.format(c.storageDuration), unit: 'h' }
				: { value: '--' }
	},
	roundTrip: {
		label: 'Round-trip Efficiency',
		compute: (c) =>
			c.roundTripEfficiency != null
				? { value: fmt0.format(c.roundTripEfficiency), unit: '%' }
				: { value: '--', subtitle: NEEDS_INTERVAL }
	},
	dcac: {
		label: 'DC:AC Ratio',
		compute: (c) => (c.dcAc != null ? { value: fmt2.format(c.dcAc.ratio) } : { value: '--' })
	}
};

/**
 * Resolve the ordered metric-descriptor ids for a fuel-tech group. Some entries
 * are conditional: gas peakers add running-hours / starts; solar adds DC:AC only
 * when an oversizing ratio is known.
 *
 * @param {import('./fuel-group.js').FuelTechGroup} group
 * @param {{ isPeaker?: boolean, hasDcAc?: boolean }} [flags]
 * @returns {string[]}
 */
export function resolveMetricKeys(group, flags = {}) {
	switch (group) {
		case 'coal':
			return ['capacityFactor', 'co2', 'intensity', 'revenue', 'avgPrice'];
		case 'gas':
			return [
				'capacityFactor',
				'co2',
				'intensity',
				'revenue',
				'avgPrice',
				...(flags.isPeaker ? ['runningHours', 'startCount'] : [])
			];
		case 'wind':
			return ['capacityFactor', 'totalEnergy', 'avgPrice', 'revenue', 'peak'];
		case 'solar':
			return ['capacityFactor', 'peak', 'avgPrice', 'revenue', ...(flags.hasDcAc ? ['dcac'] : [])];
		case 'hydro':
			return ['capacityFactor', 'totalEnergy', 'runningHours', 'avgPrice', 'revenue'];
		case 'battery':
			return ['netRevenue', 'storageDuration', 'roundTrip', 'totalEnergy', 'capacityFactor'];
		default:
			return ['capacityFactor', 'totalEnergy', 'revenue', 'avgPrice'];
	}
}
