import { createNetworkMarketData } from '$lib/components/charts/network/network-market-data.svelte.js';
import { createNetworkFuelTechSeries } from '$lib/components/charts/network/network-fueltech-series.svelte.js';
import { createMarketSeriesProvider } from '$lib/components/charts/network/network-series-provider.svelte.js';
import { isRollingInterval } from '$lib/components/charts/facility/range-interval-config.js';
import { getIntervalHours } from '$lib/components/charts/facility/interval-hours.js';
import { getGroup } from '$lib/components/charts/network/groups.js';
import { createHeadlessSeriesProvider } from '$lib/components/charts/network/headless-series-provider.svelte.js';
import { processEmissionsIntensity } from '$lib/components/charts/network/process-emissions-intensity.js';
import { rollingShareRows, ROLLING_LEAD_MS } from './tracker-chart-overlays.js';

/** @typedef {import('$lib/components/charts/network/headless-series-provider.svelte.js').DisplayRowOptions} DisplayRowOptions */

/** Optional data sources share the chart request broker and range lifecycle.
 * @param {{selection: () => import('./types.js').TrackerUrlState,
 * range: ReturnType<typeof import('$lib/components/charts/facility/chart-range-control.svelte.js').createChartRangeControl>,
 * timeZone: () => string, needsContributionDemand?: () => boolean, needsWindowMetrics?: () => boolean}} opts
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
			(showRenewablesLine && opts.selection().generationTransform !== 'proportion') ||
			((showRenewablesLine || !!opts.needsWindowMetrics?.()) && isRollingDisplay) ||
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
		enabled: () => tablePanelOpen || showDemandLine || !!opts.needsWindowMetrics?.()
	});
	const curtailmentData = createMarketSeriesProvider({
		region: () => region,
		metricKey: () => (range.activeMetric === 'energy' ? 'curtailment_energy' : 'curtailment'),
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () => tablePanelOpen || shownCurtailment.length > 0 || !!opts.needsWindowMetrics?.()
	});
	const shareData = createMarketSeriesProvider({
		region: () => region,
		metricKey: () => 'renewable_share',
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () =>
			tablePanelOpen || ((showRenewablesLine || !!opts.needsWindowMetrics?.()) && !isRollingDisplay)
	});

	// Per-group emissions and energy components for the metrics strip: one feed
	// gives both emissions volume and intensity whatever the chart is showing,
	// processed exactly like the intensity chart so it shares its request.
	const intensityData = createHeadlessSeriesProvider({
		region: () => region,
		interval: () => range.activeInterval,
		timeZone: () => timeZone,
		enabled: () => !!opts.needsWindowMetrics?.(),
		spec: () => {
			const interval = range.activeInterval;
			const tz = timeZone;
			const groupConfig = getGroup(group);
			return {
				cacheScope: 'emissions-intensity-metrics',
				metric: 'emissions_intensity',
				seriesKey: group,
				processResponse: (resp) =>
					processEmissionsIntensity(resp, {
						intervalHours: getIntervalHours(interval),
						networkTimezone: tz,
						groupMap: groupConfig.fuelTechs,
						retainGroups: true
					})
			};
		}
	});

	const all = [
		marketData,
		mvData,
		emissionsData,
		demandData,
		curtailmentData,
		shareData,
		intensityData
	];
	return {
		marketData,
		mvData,
		emissionsData,
		demandData,
		curtailmentData,
		shareData,
		intensityData,
		all,
		get pending() {
			return all.some((provider) => provider.isPending);
		},
		get error() {
			return all.find((provider) => provider.error)?.error ?? null;
		},
		retry() {
			for (const provider of all) provider.reconcileFetches();
		},
		/** The provider behind the renewables share: rolling windows derive it
		 *  from 12-month sums of the market pair; native grains use the
		 *  official share series. Overlays, metrics and retries all follow it. */
		get renewablesSource() {
			return isRollingDisplay ? marketData : shareData;
		},
		/** Renewable-share display rows for a window, whichever source serves it.
		 * @param {number} start @param {number} end
		 * @param {DisplayRowOptions} rowOpts - The table's mean-aggregated display options */
		renewableShareRows(start, end, rowOpts) {
			return isRollingDisplay
				? rollingShareRows(marketData.getVisibleRows(start - ROLLING_LEAD_MS, end), {
						startMs: start,
						endMs: end,
						displayInterval: rowOpts.displayInterval,
						ianaTimeZone: rowOpts.ianaTimeZone,
						bucketFilter: rowOpts.bucketFilter ?? null
					})
				: shareData.getDisplayRows(start, end, rowOpts);
		}
	};
}
