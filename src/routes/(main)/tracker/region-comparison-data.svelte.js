import { adjustComparisonInflation } from '$lib/comparison-cpi.js';
import { processComparisonFinancial, processComparisonFlows } from './comparison-metrics.js';
import { untrack } from 'svelte';
import { createHeadlessSeriesProvider } from '$lib/components/charts/network/headless-series-provider.svelte.js';
import { createNetworkMarketData } from '$lib/components/charts/network/network-market-data.svelte.js';
import {
	CLOSED_NETWORKS,
	COMPARISON_REGIONS,
	aggregateComparison,
	assembleComparisonMonthly,
	comparisonBounds,
	comparisonSourceActive,
	comparisonStatus,
	monthStart,
	processComparisonEnergy
} from './region-comparison.js';

/** @typedef {import('$lib/components/charts/network/headless-series-provider.svelte.js').HeadlessSeriesProvider} HeadlessSeriesProvider */
/** @typedef {Record<keyof import('./region-comparison.js').ComparisonSourceRows, HeadlessSeriesProvider>} ProviderSet */

/** Providers use UTC as a calendar-label axis. Each API returns its own local
 * period; stripping offsets aligns January with January, including WEM. The
 * join, roll-up and status rules are pure (`region-comparison.js`); this
 * module only owns the provider lifecycle.
 *
 * Each region's monthly providers are pinned to the full history of complete
 * months up to `now` and stay warm; every interval is aggregated from those
 * months. `now` moves only when the reader refreshes.
 *
 * Only the selection's interval, filter and regions are derived here: a pan
 * replaces the selection object every frame, and reading it wholesale would
 * rebuild the joined dataset on each frame.
 * @param {() => import('./region-comparison.js').RegionComparisonSelection} selection
 * @param {() => number} now @param {() => ReturnType<typeof import('$lib/comparison-cpi.js').comparisonCpi>} cpi */
export function createRegionComparisonData(selection, now, cpi) {
	// Primitive bounds, so a refresh within the same month keeps their identity.
	let boundsStart = $derived(comparisonBounds(now()).start);
	let boundsEnd = $derived(comparisonBounds(now()).end);
	let bounds = $derived({ start: boundsStart, end: boundsEnd });
	let interval = $derived(selection().interval);
	let filter = $derived(selection().filter);

	/** @param {string} id @param {() => boolean} enabled @returns {ProviderSet} */
	function buildProviders(id, enabled) {
		const calendar = {
			region: () => id,
			interval: () => '1M',
			timeZone: () => '+00:00'
		};
		return {
			energy: createHeadlessSeriesProvider({
				...calendar,
				enabled,
				spec: () => ({
					cacheScope: 'region-comparison',
					metric: 'emissions_intensity',
					seriesKey: 'components',
					processResponse: processComparisonEnergy
				})
			}),
			market: createNetworkMarketData({ ...calendar, basis: () => 'energy', enabled }),
			financial: createHeadlessSeriesProvider({
				...calendar,
				enabled,
				spec: () => ({
					cacheScope: 'region-comparison-financial',
					metric: 'price_vw',
					seriesKey: 'components',
					processResponse: processComparisonFinancial
				})
			}),
			flows: createHeadlessSeriesProvider({
				...calendar,
				enabled: () => enabled() && !CLOSED_NETWORKS.includes(id),
				spec: () => ({
					cacheScope: 'region-comparison-flows',
					metric: 'flows_energy',
					seriesKey: 'components',
					processResponse: processComparisonFlows
				})
			})
		};
	}

	const sources = COMPARISON_REGIONS.filter((region) => region.value !== 'au').map((region) => {
		const id = region.value;
		let active = $derived(comparisonSourceActive(selection().regions, id));
		const providers = buildProviders(id, () => active);
		const all = Object.values(providers);
		$effect(() => {
			const { start, end } = bounds;
			if (!active) return;
			untrack(() => {
				for (const provider of all) {
					provider.setViewport(start, end - 1);
					provider.reconcileFetches();
				}
			});
		});
		return { id, enabled: () => active, providers, all };
	});
	let status = $derived(
		comparisonStatus(
			Object.fromEntries(
				sources.map((source) => {
					const { all } = source;
					return [
						source.id,
						{
							pending: source.enabled() && all.some((provider) => provider.isPending),
							error: all.find((provider) => provider.error)?.error ?? null
						}
					];
				})
			)
		)
	);
	let data = $derived.by(() => {
		/** Monthly rows arrive in one response, so a region is blank until its
		 * first load completes; a refresh or a failed one keeps the months
		 * already held on screen while the newest are fetched again.
		 * @param {typeof sources[number]} source @param {HeadlessSeriesProvider} provider */
		const read = (source, provider) =>
			source.enabled() ? provider.getVisibleRows(bounds.start, bounds.end - 1) : [];
		const rows = assembleComparisonMonthly(
			Object.fromEntries(
				sources.map((source) => {
					const { providers } = source;
					return [
						source.id,
						{
							energy: read(source, providers.energy),
							market: read(source, providers.market),
							financial: read(source, providers.financial),
							flows: read(source, providers.flows)
						}
					];
				})
			)
		);
		return Object.fromEntries(
			Object.entries(rows).map(([id, list]) => [
				id,
				aggregateComparison(adjustComparisonInflation(list, cpi()), interval, bounds.end, filter)
			])
		);
	});
	return {
		get bounds() {
			return bounds;
		},
		get data() {
			return data;
		},
		get status() {
			return status;
		},
		get pending() {
			return selection().regions.some((id) => status[id].pending);
		},
		/** The reader asked for fresh data: every shown region revisits its two
		 * newest complete months past caches, as Timeline revisits its newest
		 * buckets. Call after moving `now`, so a new month is fetched too. */
		refresh() {
			const tailStart = monthStart(bounds.end, -2);
			for (const source of sources) {
				if (!source.enabled()) continue;
				for (const provider of source.all) {
					provider.invalidateTail(tailStart, { force: true });
					provider.reconcileFetches();
				}
			}
		},
		/** @param {string} id */
		retry(id) {
			for (const source of sources) {
				if (source.id === id || (id === 'au' && CLOSED_NETWORKS.includes(source.id)))
					for (const provider of source.all) provider.reconcileFetches();
			}
		}
	};
}
