/**
 * Network emissions-intensity processing.
 *
 * `/api/network/data?metric=emissions_intensity` returns an emissions series
 * plus an energy basis in one response — `power` at sub-daily grains, `energy`
 * at daily-and-coarser. The processor collapses each to a network-wide total
 * per native bucket and normalises the basis to MWh, emitting COMPONENT rows
 * (`emissions`, `energy_mwh`), not the ratio: components survive display
 * aggregation by summing, so the chart derives intensity per DISPLAY bucket as
 * a ratio of sums — the same semantics as the facility charts'
 * `deriveIntensityRows` — instead of a mean of ratios.
 */

import {
	collectSeriesByTimestamp,
	rowsFromSeriesMaps
} from '$lib/components/charts/v2/series-rows.js';
import { intensityKgPerMWh } from '$lib/components/charts/facility/intensity-lines.js';

export const INTENSITY_SERIES_ID = 'intensity';
const EMISSIONS_ID = 'emissions';
const ENERGY_ID = 'energy_mwh';

/**
 * @typedef {Object} ProcessEmissionsIntensityConfig
 * @property {number} intervalHours - Native bucket length in hours (converts a
 *   power basis to MWh; ignored when the basis is already energy)
 * @property {string} [networkTimezone] - Offset string (default: '+10:00')
 */

/**
 * @param {any} response - Raw OE API response ({ data: [{ metric, results }] })
 * @param {ProcessEmissionsIntensityConfig} config
 * @returns {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string>, seriesColours: Record<string, string> } | null}
 */
export function processEmissionsIntensity(response, config) {
	if (!response?.data) return null;

	const { intervalHours, networkTimezone = '+10:00' } = config;

	/**
	 * Network-wide sum of one metric's fueltech series per timestamp. The
	 * aggregate `battery` series is excluded like everywhere else — its power
	 * nets the charging/discharging splits (double-count) and its emissions
	 * are zero either way.
	 * @param {string} metricFilter
	 */
	const collectTotal = (metricFilter) =>
		collectSeriesByTimestamp(response, {
			metricFilter,
			networkTimezone,
			mode: 'sum',
			shouldInvert: () => false,
			classifySeries: (series) => {
				const fuelTech = series.columns?.fueltech || series.name;
				return fuelTech === 'battery' ? null : { id: metricFilter };
			}
		});

	const emissions = collectTotal('emissions');
	if (emissions.seriesMaps.size === 0) return null;

	// The response carries whichever basis the route fetched for the grain.
	let basisMetric = 'power';
	let basis = collectTotal('power');
	if (basis.seriesMaps.size === 0) {
		basisMetric = 'energy';
		basis = collectTotal('energy');
	}
	if (basis.seriesMaps.size === 0) return null;

	/** @type {Map<string, Map<number, number>>} */
	const merged = new Map();
	merged.set(
		EMISSIONS_ID,
		/** @type {Map<number, number>} */ (emissions.seriesMaps.get('emissions'))
	);

	// Normalise the basis onto MWh per native bucket.
	const basisMap = /** @type {Map<number, number>} */ (basis.seriesMaps.get(basisMetric));
	/** @type {Map<number, number>} */
	const energyMap = new Map();
	for (const [ms, value] of basisMap) {
		energyMap.set(ms, basisMetric === 'power' ? value * intervalHours : value);
	}
	merged.set(ENERGY_ID, energyMap);

	/** @type {Set<number>} */
	const timestamps = new Set([...emissions.timestamps, ...basis.timestamps]);

	return {
		data: rowsFromSeriesMaps(merged, timestamps, [EMISSIONS_ID, ENERGY_ID]),
		seriesNames: [EMISSIONS_ID, ENERGY_ID],
		seriesLabels: { [EMISSIONS_ID]: 'Emissions (t)', [ENERGY_ID]: 'Energy (MWh)' },
		seriesColours: { [EMISSIONS_ID]: '#594929', [ENERGY_ID]: '#888888' }
	};
}

/**
 * Derive the intensity line from DISPLAY-aggregated component rows — a ratio
 * of sums per display bucket (tonnes → kg ×1000, ÷ MWh), nulled where there is
 * no generated energy to attribute the emissions to.
 *
 * @param {Array<{ date: any, time: number, emissions?: number | null, energy_mwh?: number | null }>} rows
 * @returns {Array<{ date: any, time: number, intensity: number | null }>}
 */
export function deriveIntensityDisplayRows(rows) {
	return rows.map((row) => {
		const emissionsTotal = typeof row.emissions === 'number' ? row.emissions : null;
		const energyMWh = typeof row.energy_mwh === 'number' ? row.energy_mwh : 0;
		return {
			date: row.date,
			time: row.time,
			intensity: intensityKgPerMWh(emissionsTotal, energyMWh)
		};
	});
}
