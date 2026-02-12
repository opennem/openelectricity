<script>
	/**
	 * Stratum Chart Component
	 *
	 * Main wrapper component that combines header, tooltip, and chart.
	 * Provides a complete, self-contained chart experience.
	 *
	 * Named "Stratum" to reflect the layered/stacked nature of the visualization.
	 */
	import ChartHeader from './ChartHeader.svelte';
	import ChartTooltip from './ChartTooltip.svelte';
	import StackedAreaChart from './StackedAreaChart.svelte';
	import StackedCategoryChart from './StackedCategoryChart.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart - The chart store instance
	 * @property {boolean} [showHeader] - Whether to show the header
	 * @property {boolean} [showTooltip] - Whether to show the tooltip
	 * @property {boolean} [showOptions] - Whether to show options button in header
	 * @property {string} [defaultTooltipText] - Default text when nothing is hovered
	 * @property {string} [class] - Additional CSS classes for the container
	 * @property {string} [chartPadding] - CSS classes for chart padding
	 * @property {number} [height] - Chart height in pixels
	 * @property {string} [netTotalKey] - Key for net total values (category chart only)
	 * @property {string} [netTotalColor] - Color for net total line
	 * @property {*} [overlayStart] - Start category for hatched overlay (e.g., projection start)
	 * @property {(time: number, key?: string) => void} [onhover] - Callback when hovering
	 * @property {() => void} [onhoverend] - Callback when hover ends
	 * @property {(time: number) => void} [onfocus] - Callback when focusing (clicking)
	 * @property {(() => void)} [onpanstart] - Called when pan starts
	 * @property {((deltaMs: number) => void)} [onpan] - Called during pan with time delta
	 * @property {(() => void)} [onpanend] - Called when pan ends
	 * @property {((factor: number, centerMs: number) => void)} [onzoom] - Called during zoom
	 * @property {boolean} [enablePan] - Whether panning is enabled
	 * @property {Array<{start: number, end: number}>} [loadingRanges] - Ranges being fetched
	 * @property {[number, number] | null} [viewDomain] - Time domain for category chart pan/zoom
	 * @property {import('svelte').Snippet} [header] - Custom header content
	 * @property {import('svelte').Snippet} [tooltip] - Custom tooltip content
	 * @property {import('svelte').Snippet} [footer] - Custom footer content
	 * @property {number} [_height] - Chart height in pixels (unused, reserved)
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
		_height,
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

	// Check if chart has data
	let hasData = $derived(chart?.seriesData?.length > 0);

	/**
	 * Handle mouse move events from the chart
	 * @param {{ data: any, key?: string }} event
	 */
	function handleMouseMove(event) {
		if (event?.data) {
			if (chart.isCategoryChart) {
				const category = event.data[chart.xKey];
				chart.setHoverCategory(category, event.key);
				onhover?.(category, event.key);
			} else {
				chart.setHover(event.data.time, event.key);
				onhover?.(event.data.time, event.key);
			}
		}
	}

	/**
	 * Handle mouse out events
	 */
	function handleMouseOut() {
		chart.clearHover();
		onhoverend?.();
	}

	/**
	 * Handle click/pointer up events
	 * @param {any} data
	 */
	function handlePointerUp(data) {
		if (chart.isCategoryChart) {
			const category = data?.[chart.xKey];
			if (category !== undefined) {
				if (onfocus) {
					onfocus(category);
				} else {
					chart.toggleFocusCategory(category);
				}
			}
		} else if (data?.time) {
			if (onfocus) {
				// Let parent handle sync across all charts
				onfocus(data.time);
			} else {
				// No sync, handle locally
				chart.toggleFocus(data.time);
			}
		}
	}
</script>

<div class="stratum-chart {className}">
	<!-- Header -->
	{#if showHeader}
		{#if header}
			{@render header()}
		{:else}
			<ChartHeader {chart} {showOptions} />
		{/if}
	{/if}

	<!-- Tooltip -->
	{#if showTooltip}
		<div class="relative z-10" style="padding-right: var(--pad-right, 0);">
			{#if tooltip}
				{@render tooltip()}
			{:else}
				<ChartTooltip {chart} defaultText={defaultTooltipText} />
			{/if}
		</div>
	{/if}

	<!-- Chart -->
	<div class={chartPadding}>
		{#if hasData}
			{#if chart.isCategoryChart}
				<StackedCategoryChart
					{chart}
					{netTotalKey}
					{netTotalColor}
					{overlayStart}
					onmousemove={handleMouseMove}
					onmouseout={handleMouseOut}
					onpointerup={handlePointerUp}
					{onpanstart}
					{onpan}
					{onpanend}
					{onzoom}
					{enablePan}
					{viewDomain}
				/>
			{:else}
				<StackedAreaChart
					{chart}
					onmousemove={handleMouseMove}
					onmouseout={handleMouseOut}
					onpointerup={handlePointerUp}
					{onpanstart}
					{onpan}
					{onpanend}
					{enablePan}
					{loadingRanges}
				/>
			{/if}
		{:else}
			<div class="flex items-center justify-center h-64 text-gray-400">
				<span>No data available</span>
			</div>
		{/if}
	</div>

	<!-- Footer (optional) -->
	{#if footer}
		{@render footer()}
	{/if}
</div>

<style>
	/* Remove focus outlines from all SVG elements within charts */
	.stratum-chart :global(svg *:focus) {
		outline: none;
	}
</style>
