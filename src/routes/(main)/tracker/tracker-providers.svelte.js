import { createNetworkMarketData } from '$lib/components/charts/network/network-market-data.svelte.js';
import { createNetworkFuelTechSeries } from '$lib/components/charts/network/network-fueltech-series.svelte.js';
import { createMarketSeriesProvider } from '$lib/components/charts/network/network-series-provider.svelte.js';
import { isRollingInterval } from '$lib/components/charts/facility/range-interval-config.js';

/** Optional data sources share the chart request broker and range lifecycle.
 * @param {{selection: () => import('./types.js').TrackerUrlState,
 * range: ReturnType<typeof import('$lib/components/charts/facility/chart-range-control.svelte.js').createChartRangeControl>,
 * timeZone: () => string, needsContributionDemand?: () => boolean}} opts
 */
export function createTrackerProviders(opts) {
	const range = opts.range;
	let region = $derived(opts.selection().region);
	let group = $derived(opts.selection().group);
	let tablePanelOpen = $derived(opts.selection().tablePanelOpen);
	let showDemandLine = $derived(opts.selection().overlays.includes('demand'));
	let showRenewablesLine = $derived(opts.selection().overlays.includes('renewables'));
	let shownCurtailment = $derived(
		opts.selection().overlays.filter((id) => id.startsWith('curtailment-'))
	);
	let isRollingDisplay = $derived(isRollingInterval(range.displayInterval));
	let timeZone = $derived(opts.timeZone());
	const marketData = createNetworkMarketData({
		region: () => region,
		basis: () => range.activeMetric,
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () =>
			tablePanelOpen ||
			(showRenewablesLine && isRollingDisplay) ||
			!!opts.needsContributionDemand?.()
	});
	// Per-fuel-tech market value and emissions feed the table's Av price and
	// Emissions/Intensity columns; each shares its fetch with the matching chart.
	const mvData = createNetworkFuelTechSeries({
		region: () => region,
		group: () => group,
		metric: 'market_value',
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () => tablePanelOpen
	});
	const emissionsData = createNetworkFuelTechSeries({
		region: () => region,
		group: () => group,
		metric: 'emissions',
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () => tablePanelOpen
	});
	// Legacy-parity extras, all official OE series (not derived): operational
	// demand, the solar/wind curtailment pair, and the renewable share.
	const demandData = createMarketSeriesProvider({
		region: () => region,
		metricKey: () => (range.activeMetric === 'energy' ? 'demand_energy' : 'demand'),
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () => tablePanelOpen || showDemandLine
	});
	const curtailmentData = createMarketSeriesProvider({
		region: () => region,
		metricKey: () => (range.activeMetric === 'energy' ? 'curtailment_energy' : 'curtailment'),
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () => tablePanelOpen || shownCurtailment.length > 0
	});
	const shareData = createMarketSeriesProvider({
		region: () => region,
		metricKey: () => 'renewable_share',
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () => tablePanelOpen || (showRenewablesLine && !isRollingDisplay)
	});

	const all = [marketData, mvData, emissionsData, demandData, curtailmentData, shareData];
	return {
		marketData,
		mvData,
		emissionsData,
		demandData,
		curtailmentData,
		shareData,
		all,
		get pending() {
			return all.some((provider) => provider.isPending);
		},
		get error() {
			return all.find((provider) => provider.error)?.error ?? null;
		},
		retry() {
			for (const provider of all) provider.reconcileFetches();
		}
	};
}
