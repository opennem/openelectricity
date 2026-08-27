<script>
	/**
	 * NetworkMetrics — at-a-glance metrics for the selected network/region scope,
	 * computed over the charts' visible range so the numbers track pan/zoom.
	 *
	 * The network analogue of FacilityMetrics: a declarative renderer over the
	 * `NETWORK_METRICS` registry, all cells reading one shared ctx built from
	 * three visible-range row sets — the generation chart's rows, the price
	 * chart's rows and the headless renewables/gross-demand pair. `viewStart`/
	 * `viewEnd` are the owner's debounced snapshot (taken when the charts'
	 * visible data lands), so ctx recomputes on that cadence rather than per
	 * pan frame; the market provider's rows are read reactively, so a pair
	 * fetch that settles later still refreshes the grid.
	 */

	import MetricCard from '$lib/components/charts/facility/metrics/MetricCard.svelte';
	import {
		NETWORK_METRICS,
		NETWORK_METRIC_KEYS
	} from '$lib/components/charts/network/network-metric-definitions.js';
	import { buildNetworkMetricsContext } from '$lib/components/charts/network/network-metrics-calc.js';
	import { formatTooltipDateTime } from '$lib/components/charts/v2/formatters.js';
	import { ianaFromOffset } from '$lib/components/charts/v2/network-time.js';

	/**
	 * @type {{
	 *   generationData?: { data: any[], seriesNames: string[], seriesLabels: Record<string, string> } | null,
	 *   priceData?: { data: any[], seriesNames: string[], seriesLabels: Record<string, string> } | null,
	 *   marketProvider: ReturnType<typeof import('$lib/components/charts/network/network-market-data.svelte.js').createNetworkMarketData>,
	 *   viewStart?: number,
	 *   viewEnd?: number,
	 *   basis?: 'power' | 'energy',
	 *   displayInterval?: string,
	 *   timeZone?: string,
	 *   metricKeys?: readonly string[],
	 *   onpeakhighlight?: (time: number | undefined) => void
	 * }}
	 */
	let {
		generationData = null,
		priceData = null,
		marketProvider,
		viewStart = 0,
		viewEnd = 0,
		basis = 'power',
		displayInterval = '30m',
		timeZone = '+10:00',
		metricKeys = NETWORK_METRIC_KEYS,
		onpeakhighlight
	} = $props();

	let ianaTimeZone = $derived(ianaFromOffset(timeZone));

	/** @type {import('$lib/components/charts/network/network-metrics-calc.js').NetworkMetricsContext} */
	let ctx = $derived.by(() => {
		const marketRows =
			viewStart && viewEnd ? marketProvider.getVisibleRows(viewStart, viewEnd) : [];
		return buildNetworkMetricsContext({
			generationRows: generationData?.data ?? [],
			generationSeriesNames: generationData?.seriesNames ?? [],
			marketRows,
			priceRows: priceData?.data ?? [],
			priceSeriesNames: priceData?.seriesNames ?? [],
			basis,
			formatPeriodLabel: (timeMs) =>
				formatTooltipDateTime(new Date(timeMs), ianaTimeZone, displayInterval)
		});
	});
</script>

<!-- Metric grid — flush; the parent card supplies the outer border. Cells carry
     border-r/border-b; the -mr/-mb pull + overflow clip drop the outer edges.
     Two columns only: the host panel is ~400px wide on a desktop viewport, so
     the viewport-based sm: breakpoint must not widen the grid. -->
<div class="overflow-hidden">
	<div class="grid grid-cols-2 -mr-px -mb-px">
		{#each metricKeys as key (key)}
			{@const result = NETWORK_METRICS[key].compute(ctx)}
			{@const interactive = result.highlightTime != null}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="border-r border-b border-mid-warm-grey/40 px-4 py-3 {interactive
					? 'cursor-help transition-colors hover:bg-light-warm-grey/40'
					: ''}"
				onmouseenter={interactive ? () => onpeakhighlight?.(result.highlightTime) : undefined}
				onmouseleave={interactive ? () => onpeakhighlight?.(undefined) : undefined}
			>
				<MetricCard
					label={result.label ?? NETWORK_METRICS[key].label}
					value={result.value}
					unit={result.unit ?? ''}
					subtitle={result.subtitle ?? ''}
					description={NETWORK_METRICS[key].description}
				/>
			</div>
		{/each}
	</div>
</div>
