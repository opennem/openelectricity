import { untrack } from 'svelte';
import { createHeadlessSeriesProvider } from '$lib/components/charts/network/headless-series-provider.svelte.js';
import { loadGroupsFor } from '$lib/components/charts/network/groups.js';
import { processNetworkData } from '$lib/components/charts/network/process-network-data.js';
import { processPriceData } from '$lib/components/charts/facility/process-price-data.js';
import { getFuelTechColour } from '$lib/components/charts/colours.js';

/**
 * One bounded profile source on the shared headless provider: the same
 * request broker, cache and retry lifecycle as every other tracker feed, but
 * fetching exactly the selected complete days — never a speculative buffer.
 * Power stays enabled while inspecting price, so the all-technology overview
 * shares the existing request.
 *
 * Must be called during component init — it registers `$effect`s.
 * @param {() => {region: string, metric: 'power' | 'price', zone: string,
 * group: ReturnType<typeof import('$lib/components/charts/network/groups.js').getGroup>,
 * window: {start: number, end: number}, enabled?: boolean}} options */
export function createProfileData(options) {
	let config = $derived(options());
	const provider = createHeadlessSeriesProvider({
		region: () => config.region,
		interval: () => '5m',
		timeZone: () => config.zone,
		enabled: () => config.enabled !== false,
		exactWindow: true,
		spec: () => {
			const { metric, zone, group } = config;
			return {
				cacheScope: `time-of-day-${metric}`,
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
							})
			};
		}
	});
	// The window the provider has actually been asked for. Until the effect
	// below catches up with a new selection, the source reports pending rather
	// than serving the previous window's rows under the new label.
	let requested = $state.raw({ start: 0, end: 0 });
	$effect(() => {
		const { start, end } = config.window;
		// Untracked: the manager's request path reads its own cache state, and
		// tracking it here would re-request the window every time a response
		// landed (fetching the uncovered tail again and again).
		untrack(() => provider.setViewport(start, end));
		requested = { start, end };
	});
	let error = $derived(provider.error);
	let pending = $derived(
		!error &&
			(provider.isPending ||
				requested.start !== config.window.start ||
				requested.end !== config.window.end)
	);
	return {
		/** Native 5-minute rows inside the selected window. */
		get rows() {
			return provider.getVisibleRows(config.window.start, config.window.end);
		},
		get meta() {
			return provider.seriesMeta;
		},
		get pending() {
			return pending;
		},
		get error() {
			return error;
		},
		retry() {
			provider.reconcileFetches();
		}
	};
}
