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
	comparisonBoundsFor,
	comparisonSourceActive,
	comparisonStatus,
	dailyFetchWindow,
	processComparisonEnergy
} from './region-comparison.js';

/** @typedef {import('$lib/components/charts/network/headless-series-provider.svelte.js').HeadlessSeriesProvider} HeadlessSeriesProvider */
/** @typedef {Record<keyof import('./region-comparison.js').ComparisonSourceRows, HeadlessSeriesProvider>} ProviderSet */

/** Providers use UTC as a calendar-label axis. Each API returns its own local
 * period; stripping offsets aligns January with January, including WEM. The
 * join, roll-up and status rules are pure (`region-comparison.js`); this
 * module only owns the provider lifecycle.
 *
 * Two provider sets exist per region. The monthly set is pinned once to the
 * full history and stays warm. The daily set, enabled only for the daily
 * interval, fetches the viewport plus three whole months either side, so a
 * slide inside that buffer fetches nothing and crossing a month boundary
 * fetches one month; `settle()` reconciles the window once a gesture rests.
 *
 * Only the selection's interval and regions are derived here: a pan replaces
 * the selection object every frame, and reading it wholesale would rebuild
 * the joined dataset on each frame.
 * @param {() => import('./region-comparison.js').RegionComparisonSelection} selection
 * @param {number} now @param {() => ReturnType<typeof import('$lib/comparison-cpi.js').comparisonCpi>} cpi
 * @param {() => {start: number, end: number}} viewport */
export function createRegionComparisonData(selection, now, cpi, viewport) {
	const bounds = comparisonBounds(now);
	const dailyBounds = comparisonBoundsFor(bounds, '1d');
	// A derived boolean, not a getter over the selection object: providers track
	// their `enabled` input, and a pan replaces the selection without changing it.
	let interval = $derived(selection().interval);
	let isDaily = $derived(interval === '1d');
	const daily = () => isDaily;
	// Two number deriveds rather than one object: a pan frame that stays inside
	// the buffer must leave every downstream derived (the joined dataset above
	// all) untouched, and an object would be a new identity every frame.
	let fetchStart = $derived(dailyFetchWindow(viewport(), dailyBounds).start);
	let fetchEnd = $derived(dailyFetchWindow(viewport(), dailyBounds).end);

	/** @param {string} id @param {'1M' | '1d'} interval @param {() => boolean} enabled @returns {ProviderSet} */
	function buildProviders(id, interval, enabled) {
		const calendar = {
			region: () => id,
			interval: () => interval,
			timeZone: () => '+00:00',
			exactWindow: interval === '1d'
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
		const monthly = buildProviders(id, '1M', () => active);
		const dailySet = buildProviders(id, '1d', () => active && daily());
		const monthlyAll = Object.values(monthly);
		const dailyAll = Object.values(dailySet);
		$effect(() => {
			if (!active) return;
			untrack(() => {
				for (const provider of monthlyAll) {
					provider.setViewport(bounds.start, bounds.end - 1);
					provider.reconcileFetches();
				}
			});
		});
		// Reads the two numbers directly: routed through an object-valued derived
		// this effect stopped being notified after some moves.
		$effect(() => {
			if (!active || !daily()) return;
			const start = fetchStart;
			const end = fetchEnd;
			untrack(() => {
				for (const provider of dailyAll) provider.setViewport(start, end - 1);
			});
		});
		return {
			id,
			enabled: () => active,
			daily: dailySet,
			providers: () => (daily() ? dailySet : monthly),
			all: () => (daily() ? dailyAll : monthlyAll)
		};
	});
	let status = $derived(
		comparisonStatus(
			Object.fromEntries(
				sources.map((source) => {
					const all = source.all();
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
		const isDaily = daily();
		const window = isDaily ? { start: fetchStart, end: fetchEnd } : bounds;
		/** Monthly rows arrive in one response, so a pending region is blank until
		 * it is complete; daily rows keep their cached years while a new year loads.
		 * @param {typeof sources[number]} source @param {HeadlessSeriesProvider} provider */
		const read = (source, provider) =>
			!source.enabled() || provider.error || (!isDaily && provider.isPending)
				? []
				: provider.getVisibleRows(window.start, window.end - 1);
		const rows = assembleComparisonMonthly(
			Object.fromEntries(
				sources.map((source) => {
					const providers = source.providers();
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
				aggregateComparison(
					adjustComparisonInflation(list, cpi()),
					interval,
					isDaily ? dailyBounds.end : bounds.end
				)
			])
		);
	});
	return {
		bounds,
		get data() {
			return data;
		},
		get status() {
			return status;
		},
		get pending() {
			return selection().regions.some((id) => status[id].pending);
		},
		/** A daily gesture came to rest: abort out-of-window work and fetch the
		 * remaining gaps of the settled buffer now. */
		settle() {
			if (!daily()) return;
			for (const source of sources) {
				if (!source.enabled()) continue;
				for (const provider of Object.values(source.daily)) provider.reconcileFetches();
			}
		},
		/** @param {string} id */
		retry(id) {
			for (const source of sources) {
				if (source.id === id || (id === 'au' && CLOSED_NETWORKS.includes(source.id)))
					for (const provider of source.all()) provider.reconcileFetches();
			}
		}
	};
}
