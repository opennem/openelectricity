/**
 * Generic headless market-series provider — fetches any configured market
 * metric (demand, curtailment, renewable share…) through the shared headless
 * provider core.
 *
 * The metric key resolves through `getMarketMetricConfig`, so the processed
 * series carry the same ids/labels/colours as a visible NetworkChart for the
 * same metric would.
 *
 * Must be called during component init — it registers `$effect`s.
 */

import { createHeadlessSeriesProvider } from './headless-series-provider.svelte.js';
import { getMarketMetricConfig } from './market-metrics.js';
import { processMarketData } from './process-market-data.js';

/**
 * @param {{
 *   region: () => string,
 *   metricKey: () => string,
 *   interval: () => string,
 *   timeZone: () => string,
 *   enabled?: () => boolean
 * }} opts - Reactive getters. A disabled provider (or an unknown metric)
 *   fetches nothing and replays its last viewport when enabled.
 */
export function createMarketSeriesProvider(opts) {
	return createHeadlessSeriesProvider({
		region: opts.region,
		interval: opts.interval,
		timeZone: opts.timeZone,
		enabled: opts.enabled,
		spec: () => {
			const metricKey = opts.metricKey();
			const config = getMarketMetricConfig(metricKey);
			if (!config) return null;
			const tz = opts.timeZone();
			return {
				cacheScope: `${metricKey}-provider`,
				metric: metricKey,
				seriesKey: metricKey,
				processResponse: (resp) =>
					processMarketData(resp, { seriesDefs: config.seriesDefs, networkTimezone: tz })
			};
		}
	});
}
