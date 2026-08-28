/**
 * Build the market-value and energy components of network volume-weighted
 * price. The ratio is deferred until after display aggregation so rolling
 * values remain a ratio of sums rather than a mean of prices.
 */

import {
	collectSeriesByTimestamp,
	rowsFromSeriesMaps
} from '$lib/components/charts/v2/series-rows.js';

export const VW_PRICE_SERIES_ID = 'vw_price';
const MARKET_VALUE_ID = 'market_value';
const ENERGY_ID = 'energy_mwh';

/**
 * @typedef {Object} ProcessPriceVwConfig
 * @property {number} intervalHours - Native bucket length in hours (converts a
 *   power basis to MWh; ignored when the basis is already energy)
 * @property {string} [networkTimezone] - Offset string (default: '+10:00')
 */

/**
 * @param {any} response - Raw OE API response ({ data: [{ metric, results }] })
 * @param {ProcessPriceVwConfig} config
 * @returns {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string>, seriesColours: Record<string, string> } | null}
 */
export function processPriceVw(response, config) {
	if (!response?.data) return null;

	const { intervalHours, networkTimezone = '+10:00' } = config;

	/**
	 * Sum a metric across fuel technologies, excluding the aggregate battery
	 * series because its charging and discharging splits are already present.
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

	const marketValue = collectTotal('market_value');
	if (marketValue.seriesMaps.size === 0) return null;

	// The response carries whichever basis the route fetched for the grain.
	let basisMetric = 'energy';
	let basis = collectTotal('energy');
	if (basis.seriesMaps.size === 0) {
		basisMetric = 'power';
		basis = collectTotal('power');
	}
	if (basis.seriesMaps.size === 0) return null;

	/** @type {Map<string, Map<number, number>>} */
	const merged = new Map();
	merged.set(
		MARKET_VALUE_ID,
		/** @type {Map<number, number>} */ (marketValue.seriesMaps.get('market_value'))
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
	const timestamps = new Set([...marketValue.timestamps, ...basis.timestamps]);

	return {
		data: rowsFromSeriesMaps(merged, timestamps, [MARKET_VALUE_ID, ENERGY_ID]),
		seriesNames: [MARKET_VALUE_ID, ENERGY_ID],
		seriesLabels: { [MARKET_VALUE_ID]: 'Market value ($)', [ENERGY_ID]: 'Energy (MWh)' },
		seriesColours: { [MARKET_VALUE_ID]: '#7F7FD5', [ENERGY_ID]: '#888888' }
	};
}

/**
 * Divide display-aggregated market value by energy.
 *
 * @param {Array<{ date: any, time: number, market_value?: number | null, energy_mwh?: number | null }>} rows
 * @returns {Array<{ date: any, time: number, vw_price: number | null }>}
 */
export function deriveVwPriceDisplayRows(rows) {
	return rows.map((row) => {
		const marketValue = typeof row.market_value === 'number' ? row.market_value : null;
		const energyMWh = typeof row.energy_mwh === 'number' ? row.energy_mwh : 0;
		return {
			date: row.date,
			time: row.time,
			[VW_PRICE_SERIES_ID]: marketValue !== null && energyMWh > 0 ? marketValue / energyMWh : null
		};
	});
}
