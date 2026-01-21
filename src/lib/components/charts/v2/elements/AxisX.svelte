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
		xTextClasses = ''
	} = $props();

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

	/**
	 * Get text anchor based on position and snapTicks setting
	 * @param {number} i - Tick index
	 * @returns {'start' | 'middle' | 'end'}
	 */
	function getTextAnchor(i) {
		if (snapTicks) {
			if (i === 0) return 'start';
			if (i === tickVals.length - 1) return 'end';
		}
		return textAnchor;
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
			{@const yPos = Math.max(...$yRange)}
			<line
				class="gridline"
				{stroke}
				stroke-dasharray={strokeArray}
				y1={yPos - $height}
				y2={yPos}
				x1={xPos}
				x2={xPos}
			/>
		{/each}
	{/if}

	<!-- Tick labels and marks -->
	{#each tickVals as tick, i (tick)}
		{@const xPos = $xScale(tick)}
		{@const yPos = Math.max(...$yRange)}

		<g class="tick tick-{i}" transform="translate({xPos}, {yPos})">
			<!-- Tick mark -->
			{#if tickMarks}
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
					x={isBandwidth ? $xScale.bandwidth() / 2 + xTick : xTick}
					y={yTick}
					dx="0"
					dy="2"
					text-anchor={getTextAnchor(i)}
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
