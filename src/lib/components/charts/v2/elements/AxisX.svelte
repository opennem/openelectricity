<script>
	/**
	 * AxisX Component (v2)
	 *
	 * Renders the X (horizontal) axis with optional gridlines, tick marks, and labels.
	 */
	import { getContext } from 'svelte';

	const { width, height, xScale, yRange } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {boolean} [gridlines] - Show vertical gridlines
	 * @property {boolean} [tickMarks] - Show tick marks below axis
	 * @property {boolean} [tickLabel] - Show tick labels
	 * @property {boolean} [baseline] - Show baseline at bottom
	 * @property {boolean} [snapTicks] - Snap first/last ticks to edges
	 * @property {string} [stroke] - Gridline stroke colour
	 * @property {string} [strokeArray] - Gridline dash pattern
	 * @property {string} [clipPathId] - Optional clip path ID
	 * @property {(d: any) => any} [formatTick] - Tick formatter function
	 * @property {number | any[] | Function} [ticks] - Number of ticks, tick values, or function
	 * @property {any[]} [gridlineTicks] - Specific ticks for gridlines (if different from label ticks)
	 * @property {number} [xTick] - X offset for tick labels
	 * @property {number} [yTick] - Y offset for tick labels
	 * @property {string} [fill] - Background fill colour
	 * @property {'start' | 'middle' | 'end'} [textAnchor] - Default text anchor
	 * @property {string} [textClass] - CSS class for tick labels
	 * @property {string} [xTextClasses] - Alias for textClass (backwards compatibility)
	 * @property {boolean} [stepMode] - Step chart mode: tick marks at gridline positions, labels at midpoints
	 * @property {any[]} [highlightTicks] - Tick values to render with a darker, solid stroke
	 * @property {string} [highlightStroke] - Stroke colour for highlighted gridlines
	 * @property {any[]} [mobileHiddenTicks] - Tick values whose labels are hidden on mobile (gridlines kept)
	 * @property {boolean} [animate] - Animate tick position changes (skips the first render)
	 */

	/** @type {Props} */
	let {
		gridlines = true,
		tickMarks = false,
		tickLabel = true,
		baseline = false,
		snapTicks = false,
		stroke = '#efefef',
		strokeArray = '3',
		clipPathId = '',
		formatTick = (d) => String(d),
		ticks = undefined,
		gridlineTicks = undefined,
		xTick = 0,
		yTick = 16,
		fill = 'white',
		textAnchor = 'middle',
		textClass = 'text-xxs font-light text-mid-warm-grey',
		xTextClasses = '',
		stepMode = false,
		highlightTicks = [],
		highlightStroke = '#333',
		mobileHiddenTicks = [],
		animate = false
	} = $props();

	// Skip transition on first render — only animate subsequent changes
	let canTransition = $state(false);

	$effect(() => {
		if (animate && tickVals.length > 0 && !canTransition) {
			setTimeout(() => {
				canTransition = true;
			}, 100);
		}
	});

	let highlightTickSet = $derived(new Set(highlightTicks.map((/** @type {*} */ t) => +t)));
	let mobileHiddenTickSet = $derived(new Set(mobileHiddenTicks.map((/** @type {*} */ t) => +t)));

	// Use xTextClasses if provided (backwards compatibility)
	let effectiveTextClass = $derived(xTextClasses || textClass);

	// Check if scale has bandwidth (band scale)
	let isBandwidth = $derived(typeof $xScale.bandwidth === 'function');

	// Generate tick values for labels
	let tickVals = $derived.by(() => {
		if (Array.isArray(ticks)) return ticks;
		if (isBandwidth) return $xScale.domain();
		if (typeof ticks === 'function') return ticks($xScale.ticks());
		return $xScale.ticks(ticks);
	});

	// Generate tick values for gridlines (use gridlineTicks if provided, otherwise use tickVals)
	let gridlineTickVals = $derived(gridlineTicks ?? tickVals);

	// Chart-area bottom — invariant across ticks, so compute once rather than
	// re-spreading $yRange in every gridline/tick/label iteration.
	let axisBottom = $derived(Math.max(...$yRange));

	/**
	 * When snapTicks is on, a tick sitting on the chart's left/right edge would
	 * draw a gridline/tick-mark flush against the frame and its label would
	 * overflow, so those are suppressed/anchored. Detect the edge by PIXEL
	 * POSITION, not array index: a continuous-time axis emits interior "nice time"
	 * ticks where the first/last tick is well inside the frame and must keep its
	 * gridline (index-based detection wrongly dropped the latest gridline).
	 */
	const EDGE_PX = 1.5;
	/** @param {number} xPos */
	function isLeftEdge(xPos) {
		return snapTicks && xPos <= EDGE_PX;
	}
	/** @param {number} xPos */
	function isRightEdge(xPos) {
		return snapTicks && xPos >= $width - EDGE_PX;
	}
	/** @param {number} xPos */
	function isEdgeTick(xPos) {
		return isLeftEdge(xPos) || isRightEdge(xPos);
	}

	/**
	 * Get text anchor based on pixel position and snapTicks setting.
	 * @param {number} xPos
	 * @returns {'start' | 'middle' | 'end'}
	 */
	function getTextAnchor(xPos) {
		if (isLeftEdge(xPos)) return 'start';
		if (isRightEdge(xPos)) return 'end';
		return textAnchor;
	}

	/**
	 * Get x offset for snapped edge ticks — nudge first/last inward by 1px.
	 * @param {number} xPos
	 * @returns {number}
	 */
	function getSnapOffset(xPos) {
		if (isLeftEdge(xPos)) return 1;
		if (isRightEdge(xPos)) return -1;
		return 0;
	}
</script>

<g
	class="axis x-axis pointer-events-none"
	class:snapTicks
	clip-path={clipPathId ? `url(#${clipPathId})` : ''}
>
	<!-- Background rect for axis area -->
	<rect class="axis-background" x="0" y={$height + 1} width={$width} height={20} {fill} />

	<!-- Gridlines (rendered separately if gridlineTicks is provided) -->
	{#if gridlines}
		{#each gridlineTickVals as tick (tick)}
			{@const xPos = $xScale(tick)}
			{#if !isEdgeTick(xPos)}
				{@const yPos = axisBottom}
				{@const isHighlighted = highlightTickSet.has(+tick)}
				<line
					class="gridline"
					stroke={isHighlighted ? highlightStroke : stroke}
					stroke-dasharray={isHighlighted ? '2' : strokeArray}
					y1={yPos - $height}
					y2={yPos}
					x1={xPos}
					x2={xPos}
				/>
			{/if}
		{/each}
	{/if}

	<!-- Step mode: tick marks at gridline (band boundary) positions -->
	{#if stepMode && tickMarks}
		{#each gridlineTickVals as tick (tick)}
			{@const xPos = $xScale(tick)}
			{#if !isEdgeTick(xPos)}
				{@const yPos = axisBottom}
				<line class="tick-mark" {stroke} y1={yPos} y2={yPos + 6} x1={xPos} x2={xPos} />
			{/if}
		{/each}
	{/if}

	<!-- Tick labels (and non-step tick marks) -->
	{#each tickVals as tick, i (tick)}
		{@const xPos = $xScale(tick)}
		{@const yPos = axisBottom}

		{@const hideOnMobile = mobileHiddenTickSet.has(+tick)}
		<g
			class="tick tick-{i}"
			class:tick-animate={canTransition}
			class:hide-label-mobile={hideOnMobile}
			transform="translate({xPos}, {yPos})"
		>
			<!-- Tick mark (non-step mode only) -->
			{#if tickMarks && !stepMode && !isEdgeTick(xPos)}
				<line
					class="tick-mark"
					stroke="black"
					y1={0}
					y2={6}
					x1={isBandwidth ? $xScale.bandwidth() / 2 : 0}
					x2={isBandwidth ? $xScale.bandwidth() / 2 : 0}
				/>
			{/if}

			<!-- Tick label -->
			{#if tickLabel}
				<text
					x={isBandwidth ? $xScale.bandwidth() / 2 + xTick : xTick + getSnapOffset(xPos)}
					y={yTick}
					dx="0"
					dy="2"
					text-anchor={getTextAnchor(xPos)}
					class={effectiveTextClass}
				>
					{formatTick(tick)}
				</text>
			{/if}
		</g>
	{/each}

	<!-- Baseline -->
	{#if baseline}
		<line class="baseline" y1={$height + 0.5} y2={$height + 0.5} x1="0" x2={$width} />
	{/if}
</g>

<style>
	.tick-animate {
		transition: transform 400ms ease-in-out;
	}

	@media (max-width: 767px) {
		.hide-label-mobile text {
			display: none;
		}
	}
</style>
