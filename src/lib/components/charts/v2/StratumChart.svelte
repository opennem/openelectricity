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
	import ChartTooltipFloating from './ChartTooltipFloating.svelte';
	import StackedAreaChart from './StackedAreaChart.svelte';
	import BarChart from './BarChart.svelte';
	import ChartResizeHandle from './ChartResizeHandle.svelte';
	import { InteractionLayer } from './elements';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart
	 * @property {boolean} [showHeader]
	 * @property {boolean} [showTooltip] - DEPRECATED alias for tooltipMode: if set false, tooltipMode becomes 'none'. Prefer tooltipMode.
	 * @property {'strip' | 'floating' | 'none'} [tooltipMode] - 'strip' (default) renders above the chart; 'floating' overlays at the cursor; 'none' disables the tooltip entirely.
	 * @property {number} [tooltipDodgeRightPx] - For 'floating' mode: pixel width of a top-right UI element (e.g. zoom buttons) that the tooltip should dodge vertically.
	 * @property {number} [tooltipInsetPx] - For 'floating' mode: horizontal standoff (px) the tooltip keeps from the container's left and right edges. Use when the chart is full-bleed.
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
	 * @property {boolean} [clampHoverLine] - When true, hover line spans from y=0 to the stacked area max
	 * @property {[number, number] | null} [viewDomain]
	 * @property {boolean} [animate] - When true, stacked area grows from y=0 on data change
	 * @property {boolean} [hideAnnotationsOnMobile] - Hide annotations on mobile viewports
	 * @property {boolean} [tightAxisClip] - Clip axis content to the exact chart area (no 15 px overflow on each side) — useful for compact charts where gridlines shouldn't extend past the edges.
	 * @property {boolean} [resizable] - When true, shows a vertical resize handle below the chart that drives `chart.chartStyles.chartHeightPx`. Handle is hidden until hover on mouse devices; always visible on touch.
	 * @property {string} [heightStorageKey] - If set, the resized height persists to localStorage under this key.
	 * @property {number} [minHeight] - Minimum height (px) when resizing. Default 120.
	 * @property {number} [maxHeight] - Maximum height (px) when resizing. Default 800.
	 * @property {(height: number) => void} [onresize] - Called on every height change during drag.
	 * @property {(height: number) => void} [onresizeend] - Called once when the drag finishes.
	 * @property {import('svelte').Snippet} [header]
	 * @property {import('svelte').Snippet} [tooltip]
	 * @property {import('svelte').Snippet} [footer]
	 */

	/** @type {Props} */
	let {
		chart,
		showHeader = true,
		showTooltip = true,
		tooltipMode = /** @type {'strip' | 'floating' | 'none'} */ ('strip'),
		tooltipDodgeRightPx = 0,
		tooltipInsetPx = 0,
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
		clampHoverLine = false,
		viewDomain = null,
		animate = false,
		hideAnnotationsOnMobile = false,
		tightAxisClip = false,
		resizable = false,
		heightStorageKey,
		minHeight = 120,
		maxHeight = 800,
		onresize,
		onresizeend,
		header,
		tooltip,
		footer
	} = $props();

	let hasData = $derived(chart?.seriesData?.length > 0);

	// Resolve the effective tooltip mode, honouring the legacy `showTooltip={false}`.
	let effectiveTooltipMode = $derived(showTooltip === false ? 'none' : tooltipMode);

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
			if (chart.isCategoryChart && event.data.category !== undefined) {
				chart.setHoverCategory(event.data.category, event.key);
			} else {
				chart.setHover(event.data.time, event.key);
				onhover?.(event.data.time, event.key);
			}
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

	{#if effectiveTooltipMode === 'strip'}
		<div class="relative z-10" style="padding-right: var(--pad-right, 0);">
			{#if tooltip}
				{@render tooltip()}
			{:else}
				<ChartTooltip {chart} defaultText={defaultTooltipText} />
			{/if}
		</div>
	{/if}

	<div class="relative">
		{#if chart.chartOptions.isAnyBarType}
			<div class={chartPadding}>
				{#if hasData}
					<BarChart
						{chart}
						onmousemove={handleSeriesHover}
						onmouseout={handleSeriesHoverOut}
						onpointerup={handleSeriesClick}
					/>
				{:else}
					<div
						class="flex items-center justify-center {chart.chartStyles.chartHeightPx
							? ''
							: chart.chartStyles.chartHeightClasses}"
						style:height={chart.chartStyles.chartHeightPx
							? `${chart.chartStyles.chartHeightPx}px`
							: undefined}
					></div>
				{/if}
			</div>
		{:else}
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
						{clampHoverLine}
						{animate}
						{hideAnnotationsOnMobile}
						{tightAxisClip}
						onmousemove={handleSeriesHover}
						onmouseout={handleSeriesHoverOut}
						onpointerup={handleSeriesClick}
						{enablePan}
						{loadingRanges}
					/>
				{:else}
					<div
						class="flex items-center justify-center {chart.chartStyles.chartHeightPx
							? ''
							: chart.chartStyles.chartHeightClasses}"
						style:height={chart.chartStyles.chartHeightPx
							? `${chart.chartStyles.chartHeightPx}px`
							: undefined}
					></div>
				{/if}
			</InteractionLayer>
		{/if}

		{#if resizable}
			<ChartResizeHandle
				{chart}
				storageKey={heightStorageKey}
				{minHeight}
				{maxHeight}
				{onresize}
				{onresizeend}
			/>
		{/if}

		{#if effectiveTooltipMode === 'floating'}
			<ChartTooltipFloating {chart} dodgeRightPx={tooltipDodgeRightPx} insetPx={tooltipInsetPx} />
		{/if}
	</div>

	{#if footer}
		{@render footer()}
	{/if}
</div>

<style>
	.stratum-chart :global(svg *:focus) {
		outline: none;
	}
</style>
