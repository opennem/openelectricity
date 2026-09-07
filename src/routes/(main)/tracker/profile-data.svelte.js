import { untrack } from 'svelte';
import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
import { loadGroupsFor } from '$lib/components/charts/network/groups.js';
import { processNetworkData } from '$lib/components/charts/network/process-network-data.js';
import { processPriceData } from '$lib/components/charts/facility/process-price-data.js';
import { getFuelTechColour } from '$lib/components/charts/colours.js';

/** One bounded, identity-guarded profile source. Power remains mounted while
 * inspecting price, so the all-technology overview shares the existing request.
 * @param {() => {region: string, metric: 'power' | 'price', zone: string,
 * group: ReturnType<typeof import('$lib/components/charts/network/groups.js').getGroup>,
 * window: {start: number, end: number}, enabled?: boolean}} options */
export function createProfileData(options) {
	let config = $derived(options());
	let key = $derived(
		JSON.stringify([
			config.region,
			config.metric,
			config.zone,
			config.group.value,
			config.window.start,
			config.window.end,
			config.enabled
		])
	);
	let source = $state.raw(/** @type {{key: string, manager: ChartDataManager} | null} */ (null));
	let manager = $derived(source?.key === key ? source.manager : null);
	$effect(() => {
		const identity = key;
		const { region, metric, zone, group, window, enabled = true } = untrack(() => config);
		if (!enabled) return;
		const next = new ChartDataManager({
			cacheKey: `${region}:time-of-day`,
			networkTimezone: zone,
			interval: '5m',
			metric,
			seriesKey: group.value,
			processResponse: (response) =>
				metric === 'price'
					? processPriceData(response, { networkTimezone: zone, label: 'Spot price' })
					: processNetworkData(response, {
							groupMap: group.fuelTechs,
							groupOrder: group.order,
							groupLabels: group.labels,
							loadsToInvert: loadGroupsFor(group),
							getColour: getFuelTechColour,
							networkTimezone: zone
						}),
			buildFetchUrl: (params) => {
				params.set('region', region);
				return `/api/network/data?${params}`;
			}
		});
		source = { key: identity, manager: next };
		untrack(() => next.requestRange(window.start, window.end, { immediate: true }));
		return () => next.dispose();
	});
	return {
		get manager() {
			return manager;
		}
	};
}
