import { adjustComparisonInflation } from '$lib/comparison-cpi.js';
import { processComparisonFinancial, processComparisonFlows } from './comparison-metrics.js';
import { untrack } from 'svelte';
import { createHeadlessSeriesProvider } from '$lib/components/charts/network/headless-series-provider.svelte.js';
import { createNetworkMarketData } from '$lib/components/charts/network/network-market-data.svelte.js';
import {
	COMPARISON_REGIONS,
	aggregateComparison,
	assembleComparisonMonthly,
	comparisonBounds,
	comparisonSourceActive,
	comparisonStatus,
	processComparisonEnergy
} from './region-comparison.js';

/** @typedef {import('$lib/components/charts/network/headless-series-provider.svelte.js').HeadlessSeriesProvider} HeadlessSeriesProvider */

/** Providers use UTC as a calendar-label axis. Each API returns its own local
 * month; stripping offsets aligns January with January, including WEM. The
 * join, roll-up and status rules are pure (`region-comparison.js`); this
 * module only owns the provider lifecycle.
 * @param {() => import('./region-comparison.js').RegionComparisonSelection} selection
 * @param {number} now @param {() => any} cpi */
export function createRegionComparisonData(selection, now, cpi) {
	const bounds = comparisonBounds(now);
	const calendar = { interval: () => '1M', timeZone: () => '+00:00' };
	const sources = COMPARISON_REGIONS.filter((region) => region.value !== 'au').map((region) => {
		const id = region.value;
		let active = $derived(comparisonSourceActive(selection().regions, id));
		const enabled = () => active;
		/** @type {Record<keyof import('./region-comparison.js').ComparisonSourceRows, HeadlessSeriesProvider>} */
		const providers = {
			energy: createHeadlessSeriesProvider({
				region: () => id,
				...calendar,
				enabled,
				spec: () => ({
					cacheScope: 'region-comparison',
					metric: 'emissions_intensity',
					seriesKey: 'components',
					processResponse: processComparisonEnergy
				})
			}),
			market: createNetworkMarketData({
				region: () => id,
				basis: () => 'energy',
				...calendar,
				enabled
			}),
			financial: createHeadlessSeriesProvider({
				region: () => id,
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
				region: () => id,
				...calendar,
				enabled: () => enabled() && !['_all', 'wem'].includes(id),
				spec: () => ({
					cacheScope: 'region-comparison-flows',
					metric: 'flows_energy',
					seriesKey: 'components',
					processResponse: processComparisonFlows
				})
			})
		};
		const all = Object.values(providers);
		$effect(() => {
			if (!enabled()) return;
			untrack(() => {
				for (const provider of all) {
					provider.setViewport(bounds.start, bounds.end - 1);
					provider.reconcileFetches();
				}
			});
		});
		return { id, enabled, providers, all };
	});
	let status = $derived(
		comparisonStatus(
			Object.fromEntries(
				sources.map((source) => [
					source.id,
					{
						pending: source.enabled() && source.all.some((provider) => provider.isPending),
						error: source.all.find((provider) => provider.error)?.error ?? null
					}
				])
			)
		)
	);
	let data = $derived.by(() => {
		/** @param {typeof sources[number]} source @param {HeadlessSeriesProvider} provider */
		const read = (source, provider) =>
			!source.enabled() || provider.isPending || provider.error
				? []
				: provider.getVisibleRows(bounds.start, bounds.end - 1);
		const monthly = assembleComparisonMonthly(
			Object.fromEntries(
				sources.map((source) => [
					source.id,
					{
						energy: read(source, source.providers.energy),
						market: read(source, source.providers.market),
						financial: read(source, source.providers.financial),
						flows: read(source, source.providers.flows)
					}
				])
			)
		);
		return Object.fromEntries(
			Object.entries(monthly).map(([id, rows]) => [
				id,
				aggregateComparison(
					adjustComparisonInflation(rows, cpi()),
					selection().interval,
					bounds.end
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
		/** @param {string} id */
		retry(id) {
			for (const source of sources) {
				if (source.id === id || (id === 'au' && ['_all', 'wem'].includes(source.id)))
					for (const provider of source.all) provider.reconcileFetches();
			}
		}
	};
}
