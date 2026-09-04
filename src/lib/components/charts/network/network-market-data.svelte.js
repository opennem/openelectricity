/**
 * Headless market-series provider for the tracker's network metrics.
 *
 * Fetches the renewables-share input pair — `generation_renewable` +
 * `demand_gross` (or their `_energy` variants) — through the shared headless
 * provider core. Both basis variants are mapped onto the same series ids so
 * downstream metric computes are basis-agnostic.
 *
 * Must be called during component init — it registers `$effect`s.
 */

import { createHeadlessSeriesProvider } from './headless-series-provider.svelte.js';
import { processMarketData } from './process-market-data.js';

/** Stable series ids shared with the metrics calc. */
export const RENEWABLES_SERIES_ID = 'renewables';
export const DEMAND_GROSS_SERIES_ID = 'demand_gross';

/**
 * One def per OE metric in the response — the energy basis is the same pair
 * with `_energy`-suffixed metric names. Colours are unused (nothing charts
 * these series) but the processor requires them.
 * @type {import('./process-market-data.js').MarketSeriesDef[]}
 */
const BASE_SERIES_DEFS = [
	{
		metric: 'generation_renewable',
		id: RENEWABLES_SERIES_ID,
		label: 'Renewables',
		colour: '#2D9B14'
	},
	{
		metric: 'demand_gross',
		id: DEMAND_GROSS_SERIES_ID,
		label: 'Gross demand',
		colour: '#6A6A6A'
	}
];

/** @param {'power' | 'energy'} basis */
const seriesDefsFor = (basis) =>
	BASE_SERIES_DEFS.map((def) =>
		basis === 'energy' ? { ...def, metric: `${def.metric}_energy` } : def
	);

/** @param {'power' | 'energy'} basis */
const metricKeyFor = (basis) => (basis === 'energy' ? 'renewables_energy' : 'renewables');

/**
 * @param {{
 *   region: () => string,
 *   basis: () => 'power' | 'energy',
 *   interval: () => string,
 *   timeZone: () => string,
 *   enabled?: () => boolean
 * }} opts - Reactive getters. A disabled provider fetches nothing and replays
 *   its last viewport when enabled.
 */
export function createNetworkMarketData(opts) {
	return createHeadlessSeriesProvider({
		region: opts.region,
		interval: opts.interval,
		timeZone: opts.timeZone,
		enabled: opts.enabled,
		spec: () => {
			const basis = opts.basis();
			const tz = opts.timeZone();
			return {
				cacheScope: 'metrics',
				metric: metricKeyFor(basis),
				seriesKey: 'renewables-pair',
				processResponse: (resp) =>
					processMarketData(resp, { seriesDefs: seriesDefsFor(basis), networkTimezone: tz })
			};
		}
	});
}
