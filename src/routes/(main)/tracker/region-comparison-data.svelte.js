import { adjustComparisonInflation } from '$lib/comparison-cpi.js';
import { processComparisonFinancial, processComparisonFlows } from './comparison-metrics.js';
import { untrack } from 'svelte';
import { createHeadlessSeriesProvider } from '$lib/components/charts/network/headless-series-provider.svelte.js';
import { createNetworkMarketData } from '$lib/components/charts/network/network-market-data.svelte.js';
import {
	COMPARISON_REGIONS,
	aggregateComparison,
	comparisonBounds,
	joinComparisonComponents,
	processComparisonEnergy,
	sumComparisonNetworks
} from './region-comparison.js';

/** Providers use UTC as a calendar-label axis. Each API returns its own local
 * month; stripping offsets aligns January with January, including WEM.
 * @param {() => import('./region-comparison.js').RegionComparisonSelection} selection
 * @param {number} now @param {() => any} cpi */
export function createRegionComparisonData(selection, now, cpi) {
	const bounds = comparisonBounds(now);
	const sources = COMPARISON_REGIONS.filter((region) => region.value !== 'au').map((region) => {
		const id = region.value;
		let active = $derived(
			selection().regions.includes(id) ||
				(selection().regions.includes('au') && (id === '_all' || id === 'wem'))
		);
		const enabled = () => active;
		const energy = createHeadlessSeriesProvider({
			region: () => id,
			interval: () => '1M',
			timeZone: () => '+00:00',
			enabled,
			spec: () => ({
				cacheScope: 'region-comparison',
				metric: 'emissions_intensity',
				seriesKey: 'components',
				processResponse: processComparisonEnergy
			})
		});
		const market = createNetworkMarketData({
			region: () => id,
			basis: () => 'energy',
			interval: () => '1M',
			timeZone: () => '+00:00',
			enabled
		});
		const financial = createHeadlessSeriesProvider({
			region: () => id,
			interval: () => '1M',
			timeZone: () => '+00:00',
			enabled,
			spec: () => ({
				cacheScope: 'region-comparison-financial',
				metric: 'price_vw',
				seriesKey: 'components',
				processResponse: processComparisonFinancial
			})
		});
		const flows = createHeadlessSeriesProvider({
			region: () => id,
			interval: () => '1M',
			timeZone: () => '+00:00',
			enabled: () => enabled() && !['_all', 'wem'].includes(id),
			spec: () => ({
				cacheScope: 'region-comparison-flows',
				metric: 'flows_energy',
				seriesKey: 'components',
				processResponse: processComparisonFlows
			})
		});
		$effect(() => {
			if (!enabled()) return;
			untrack(() => {
				for (const provider of [energy, market, financial, flows]) {
					provider.setViewport(bounds.start, bounds.end - 1);
					provider.reconcileFetches();
				}
			});
		});
		return { id, enabled, energy, market, financial, flows };
	});
	let status = $derived.by(() => {
		/** @type {Record<string, {pending: boolean,error: string | null}>} */
		const result = {};
		for (const source of sources) {
			result[source.id] = {
				pending:
					source.enabled() &&
					(source.energy.isPending ||
						source.market.isPending ||
						source.financial.isPending ||
						source.flows.isPending),
				error:
					source.energy.error || source.market.error || source.financial.error || source.flows.error
			};
		}
		result.au = {
			pending: result._all.pending || result.wem.pending,
			error: result._all.error || result.wem.error
		};
		return result;
	});
	let data = $derived.by(() => {
		/** @type {Record<string, any[]>} */
		const monthly = {};
		for (const source of sources) {
			const read = (
				/** @type {import('$lib/components/charts/network/headless-series-provider.svelte.js').HeadlessSeriesProvider} */ provider
			) =>
				!source.enabled() || provider.isPending || provider.error
					? []
					: provider.getVisibleRows(bounds.start, bounds.end - 1);
			const core = joinComparisonComponents(read(source.energy), read(source.market));
			monthly[source.id] = joinComparisonComponents(
				joinComparisonComponents(core, read(source.financial)),
				read(source.flows)
			).map((row) => (['_all', 'wem'].includes(source.id) ? { ...row, net_imports: 0 } : row));
		}
		monthly.au = sumComparisonNetworks(monthly._all, monthly.wem);
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
				if (source.id === id || (id === 'au' && ['_all', 'wem'].includes(source.id))) {
					source.energy.reconcileFetches();
					source.market.reconcileFetches();
					source.financial.reconcileFetches();
					source.flows.reconcileFetches();
				}
			}
		}
	};
}
