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

import { getNumberFormat, formatCapacity } from '$lib/utils/formatters';

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
 * @property {number} netRevenue
 * @property {number | null} roundTripEfficiency
 * @property {number | null} storageDuration
 * @property {{ ratio: number, dcMW: number, acMW: number } | null} dcAc
 */

const NEEDS_INTERVAL = 'Requires interval data';

/** @type {Record<string, { label: string, description: string, compute: (ctx: MetricsContext) => MetricResult }>} */
export const METRICS = {
	capacityFactor: {
		label: 'Capacity Factor',
		description:
			'Energy generated over the visible range as a percentage of what running at full registered capacity for the whole period would have produced.',
		compute: (c) =>
			c.hasSummary ? { value: fmt1.format(c.capacityFactor), unit: '%' } : { value: '--' }
	},
	totalEnergy: {
		label: 'Total Energy',
		description:
			'Energy generated over the visible date range. For storage facilities (batteries, pumped hydro) this is throughput — energy charged plus energy discharged.',
		compute: (c) =>
			c.hasSummary ? { value: fmt0.format(c.totalEnergy), unit: 'MWh' } : { value: '--' }
	},
	revenue: {
		label: 'Revenue',
		description:
			'Estimated market value over the visible range — the energy in each interval multiplied by the spot price at the time.',
		compute: (c) => (c.hasSummary ? { value: formatRevenue(c.totalMV) } : { value: '--' })
	},
	avgPrice: {
		label: 'Avg Price Received',
		description:
			'Volume-weighted average price: market value divided by energy generated over the visible range.',
		compute: (c) =>
			c.hasSummary ? { value: fmt2.format(c.avgPrice), unit: '$/MWh' } : { value: '--' }
	},
	co2: {
		label: 'CO₂ Emissions',
		description: 'Reported carbon dioxide emissions over the visible date range.',
		compute: (c) =>
			c.hasEmissions
				? { value: fmt0.format(c.totalEmissions), unit: 'tCO₂' }
				: { value: '--', subtitle: 'No emissions data' }
	},
	intensity: {
		label: 'Emissions Intensity',
		description:
			'Reported emissions divided by energy generated over the visible range — energy-weighted from actual output, not a static factor.',
		compute: (c) =>
			c.emissionsIntensity != null
				? { value: fmt0.format(c.emissionsIntensity), unit: 'kgCO₂e/MWh' }
				: { value: '--' }
	},
	peak: {
		// Power-mode label; energy mode overrides it to "Peak Energy" below. Each
		// shows the period of the peak as a subtitle and annotates the chart on hover.
		label: 'Peak Output',
		description:
			'The single interval with the highest generation in the visible range (loads excluded). Hover to highlight the period on the chart.',
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
		description:
			'Hours in the visible range where at least one unit was generating (output above zero), counted from sub-daily intervals. Needs a 5- or 30-minute view.',
		compute: (c) =>
			c.hasSubDaily
				? { value: fmt0.format(c.runningHours), unit: 'h' }
				: { value: '--', subtitle: NEEDS_INTERVAL }
	},
	netRevenue: {
		label: 'Net Revenue',
		description:
			'Discharge revenue minus charging cost over the visible range — the spot-market arbitrage margin.',
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
		description:
			'How long maximum output can be sustained from full storage: energy capacity (MWh) divided by discharge capacity (MW).',
		compute: (c) =>
			c.storageDuration != null
				? { value: fmt1.format(c.storageDuration), unit: 'h' }
				: { value: '--' }
	},
	roundTrip: {
		label: 'Round-trip Efficiency',
		description:
			'Energy discharged as a percentage of energy charged over the visible range — what survives the charge/discharge cycle.',
		compute: (c) =>
			c.roundTripEfficiency != null
				? { value: fmt0.format(c.roundTripEfficiency), unit: '%' }
				: { value: '--', subtitle: NEEDS_INTERVAL }
	},
	dcac: {
		label: 'DC:AC Ratio',
		description:
			'Solar oversizing: DC panel array capacity relative to the AC grid connection. Above 1, the array can produce more than the connection can export.',
		compute: (c) =>
			c.dcAc != null
				? {
						value: fmt2.format(c.dcAc.ratio),
						subtitle: `DC array ${formatCapacity(c.dcAc.dcMW)} MW / AC connection ${formatCapacity(c.dcAc.acMW)} MW`
					}
				: { value: '--' }
	}
};

/**
 * Resolve the ordered metric-descriptor ids for a fuel-tech group. Some entries
 * are conditional: gas peakers add running-hours / starts; solar adds DC:AC only
 * when an oversizing ratio is known; any non-battery group gains storage
 * duration when the facility has battery units (mixed-tech hybrids).
 *
 * @param {import('./fuel-group.js').FuelTechGroup} group
 * @param {{ isPeaker?: boolean, hasDcAc?: boolean, hasStorage?: boolean, isPumpedHydro?: boolean }} [flags]
 * @returns {string[]}
 */
export function resolveMetricKeys(group, flags = {}) {
	/** @type {string[]} */
	let keys;
	switch (group) {
		case 'coal':
			keys = ['capacityFactor', 'co2', 'intensity', 'revenue', 'avgPrice'];
			break;
		case 'gas':
			keys = [
				'capacityFactor',
				'co2',
				'intensity',
				'revenue',
				'avgPrice',
				...(flags.isPeaker ? ['runningHours'] : [])
			];
			break;
		case 'wind':
			keys = ['capacityFactor', 'totalEnergy', 'avgPrice', 'revenue', 'peak'];
			break;
		case 'solar':
			keys = ['capacityFactor', 'peak', 'avgPrice', 'revenue', ...(flags.hasDcAc ? ['dcac'] : [])];
			break;
		case 'hydro':
			keys = [
				'capacityFactor',
				'totalEnergy',
				'runningHours',
				'avgPrice',
				'revenue',
				...(flags.isPumpedHydro ? ['roundTrip'] : [])
			];
			break;
		case 'battery':
			keys = ['netRevenue', 'storageDuration', 'roundTrip', 'totalEnergy', 'capacityFactor'];
			break;
		default:
			keys = ['capacityFactor', 'totalEnergy', 'revenue', 'avgPrice'];
	}
	// Any facility with storage units gains the duration metric (battery's
	// list already carries it in its preferred position).
	if (flags.hasStorage && !keys.includes('storageDuration')) keys.push('storageDuration');
	return keys;
}
