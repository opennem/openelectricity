/**
 * Headless per-fuel-tech series provider for the tracker's fuel-tech table.
 *
 * Fetches one grouped fuel-tech metric (`market_value`, `emissions`) —
 * exactly the processing arm of NetworkChart's stacked panels for the same
 * metric — through the shared headless provider core. When the matching chart
 * is showing that metric it issues the identical request URL, so the shared
 * broker collapses the pair into one network fetch.
 *
 * Must be called during component init — it registers `$effect`s.
 */

import { getFuelTechColour } from '$lib/components/charts/colours.js';
import { getGroup, loadGroupsFor } from './groups.js';
import { createHeadlessSeriesProvider } from './headless-series-provider.svelte.js';
import { processNetworkData } from './process-network-data.js';

/**
 * @param {{
 *   region: () => string,
 *   group: () => string,
 *   metric: 'market_value' | 'emissions',
 *   interval: () => string,
 *   timeZone: () => string,
 *   enabled?: () => boolean
 * }} opts - Reactive getters plus the fixed metric. A disabled provider
 *   fetches nothing and replays its last viewport when enabled.
 */
export function createNetworkFuelTechSeries(opts) {
	const { metric } = opts;
	return createHeadlessSeriesProvider({
		region: opts.region,
		interval: opts.interval,
		timeZone: opts.timeZone,
		enabled: opts.enabled,
		spec: () => {
			const group = opts.group();
			const groupConfig = getGroup(group);
			const tz = opts.timeZone();
			return {
				cacheScope: `${metric}-table`,
				metric,
				seriesKey: group,
				processResponse: (resp) =>
					processNetworkData(resp, {
						groupMap: groupConfig.fuelTechs,
						groupOrder: groupConfig.order,
						groupLabels: groupConfig.labels,
						// Emissions are only ever produced — the charging/pumping fuel
						// techs carry zero-or-positive tonnes, so nothing inverts.
						loadsToInvert: metric === 'emissions' ? [] : loadGroupsFor(groupConfig),
						getColour: getFuelTechColour,
						metricFilter: metric,
						networkTimezone: tz
					})
			};
		}
	});
}
