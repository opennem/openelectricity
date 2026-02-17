<script>
	/**
	 * Stratum Chart Component
	 *
	 * Main wrapper that combines header, tooltip, and chart with a unified
	 * interaction layer.  Named "Stratum" to reflect the layered nature of
	 * the visualization.
	 *
	 * InteractionLayer handles all pointer interactions on the chart-area div.
	 * StackedArea's onmousemove is the only SVG-level interaction kept —
	 * it provides the series key for hover highlighting.
	 */
	import ChartHeader from './ChartHeader.svelte';
	import ChartTooltip from './ChartTooltip.svelte';
	import StackedAreaChart from './StackedAreaChart.svelte';
	import { InteractionLayer } from './elements';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart
	 * @property {boolean} [showHeader]
	 * @property {boolean} [showTooltip]
	 * @property {boolean} [showOptions]
	 * @property {string} [defaultTooltipText]
	 * @property {string} [class]
	 * @property {string} [chartPadding]
	 * @property {string} [netTotalKey] - Key for net total values
	 * @property {string} [netTotalColor] - Color for net total line
	 * @property {*} [overlayStart] - Start category for hatched overlay (e.g., projection start)
	 * @property {(time: number, key?: string) => void} [onhover]
	 * @property {() => void} [onhoverend]
	 * @property {(time: number) => void} [onfocus]
	 * @property {(() => void)} [onpanstart]
	 * @property {((deltaMs: number) => void)} [onpan]
	 * @property {(() => void)} [onpanend]
	 * @property {((factor: number, centerMs: number) => void)} [onzoom]
	 * @property {boolean} [enablePan]
	 * @property {Array<{start: number, end: number}>} [loadingRanges]
	 * @property {[number, number] | null} [viewDomain]
	 * @property {import('svelte').Snippet} [header]
	 * @property {import('svelte').Snippet} [tooltip]
	 * @property {import('svelte').Snippet} [footer]
	 */

	/** @type {Props} */
	let {
		chart,
		showHeader = true,
		showTooltip = true,
		showOptions = true,
		defaultTooltipText = '',
		class: className = '',
		chartPadding = 'px-0',
		netTotalKey,
		netTotalColor,
		overlayStart,
		onhover,
		onhoverend,
		onfocus,
		onpanstart,
		onpan,
		onpanend,
		onzoom,
		enablePan = false,
		loadingRanges = [],
		viewDomain = null,
		header,
		tooltip,
		footer
	} = $props();

	let hasData = $derived(chart?.seriesData?.length > 0);

	/** @type {'none' | 'hover' | 'mouse-pan' | 'touch-pan'} Bound from InteractionLayer */
	let interactionMode = $state('none');

	// ---- StackedArea series-key hover (SVG level) ----
	// StackedArea's onmousemove provides { data, key } when the mouse is
	// over a coloured path.  This "upgrades" the basic time-hover with
	// series highlighting.  Suppressed during pan/zoom.

	/**
	 * @param {{ data: any, key?: string }} event
	 */
	function handleSeriesHover(event) {
		if (interactionMode !== 'none') return;
		if (event?.data) {
			chart.setHover(event.data.time, event.key);
			onhover?.(event.data.time, event.key);
		}
	}

	function handleSeriesHoverOut() {
		if (interactionMode !== 'none') return;
		chart.clearHover();
		onhoverend?.();
	}

	/**
	 * @param {any} data
	 */
	function handleSeriesClick(data) {
		if (interactionMode !== 'none') return;
		if (data?.time) {
			onfocus ? onfocus(data.time) : chart.toggleFocus(data.time);
		}
	}
</script>

<div class="stratum-chart {className}">
	{#if showHeader}
		{#if header}
			{@render header()}
		{:else}
			<ChartHeader {chart} {showOptions} />
		{/if}
	{/if}

	{#if showTooltip}
		<div class="relative z-10" style="padding-right: var(--pad-right, 0);">
			{#if tooltip}
				{@render tooltip()}
			{:else}
				<ChartTooltip {chart} defaultText={defaultTooltipText} />
			{/if}
		</div>
	{/if}

	<InteractionLayer
		{chart}
		{enablePan}
		{viewDomain}
		class={chartPadding}
		bind:interactionMode
		{onhover}
		{onhoverend}
		{onfocus}
		{onpanstart}
		{onpan}
		{onpanend}
		{onzoom}
	>
		{#if hasData}
			<StackedAreaChart
				{chart}
				{netTotalKey}
				{netTotalColor}
				{overlayStart}
				onmousemove={handleSeriesHover}
				onmouseout={handleSeriesHoverOut}
				onpointerup={handleSeriesClick}
				{enablePan}
				{loadingRanges}
			/>
		{:else}
			<div
				class="flex items-center justify-center text-gray-400 {chart.chartStyles.chartHeightPx
					? ''
					: chart.chartStyles.chartHeightClasses}"
				style:height={chart.chartStyles.chartHeightPx
					? `${chart.chartStyles.chartHeightPx}px`
					: undefined}
			>
				<span>No data available</span>
			</div>
		{/if}
	</InteractionLayer>

	{#if footer}
		{@render footer()}
	{/if}
</div>

<style>
	.stratum-chart :global(svg *:focus) {
		outline: none;
	}
</style>
