<script>
	/**
	 * AxisY Component (v2)
	 *
	 * Renders the Y (vertical) axis with optional gridlines, tick marks, and labels.
	 */
	import { getContext } from 'svelte';

	const { padding, xRange, yScale, xScale } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {boolean} [gridlines] - Show horizontal gridlines
	 * @property {boolean} [tickMarks] - Show tick marks on axis
	 * @property {string} [stroke] - Gridline stroke colour
	 * @property {string} [textFill] - Text fill colour
	 * @property {string} [clipPathId] - Optional clip path ID
	 * @property {(d: any) => any} [formatTick] - Tick formatter function
	 * @property {number | Array | Function} [ticks] - Number of ticks, tick values, or function
	 * @property {number} [xTick] - X offset for tick labels
	 * @property {number} [yTick] - Y offset for tick labels
	 * @property {number} [dxTick] - dx offset for tick labels
	 * @property {number} [dyTick] - dy offset for tick labels
	 * @property {string} [textAnchor] - Text anchor for labels
	 * @property {any} [yLabelStartPos] - Custom start position for labels
	 * @property {string} [zeroValueStroke] - Stroke colour for zero line
	 * @property {boolean} [showLastTick] - Show the last (top) tick
	 */

	/** @type {Props} */
	let {
		gridlines = true,
		tickMarks = false,
		stroke = '#efefef',
		textFill = '#666',
		clipPathId = '',
		formatTick = (d) => String(d),
		ticks = 4,
		xTick = 0,
		yTick = 0,
		dxTick = 0,
		dyTick = -4,
		textAnchor = 'start',
		yLabelStartPos = null,
		zeroValueStroke = '#353535',
		showLastTick = true
	} = $props();

	// Check if scale has bandwidth (band scale)
	let isBandwidth = $derived(typeof $yScale.bandwidth === 'function');

	// Calculate x start position for labels
	let xStart = $derived(
		yLabelStartPos ? $xScale(yLabelStartPos) : $xRange[0] + (isBandwidth ? $padding.left : 0)
	);

	// Generate tick values
	let tickVals = $derived.by(() => {
		if (Array.isArray(ticks)) return ticks;
		if (isBandwidth) return $yScale.domain();
		if (typeof ticks === 'function') return ticks($yScale.ticks());
		return $yScale.ticks(ticks);
	});
</script>

<g
	class="axis y-axis pointer-events-none"
	transform="translate({-$padding.left}, 0)"
	clip-path={clipPathId ? `url(#${clipPathId})` : ''}
>
	{#each tickVals as tick, i (i)}
		{@const yPos = $yScale(tick)}
		{@const isZero = tick === 0}
		{@const isLastTick = i === tickVals.length - 1}

		<g class="tick tick-{tick}" transform="translate({xStart}, {yPos})">
			<!-- Gridline -->
			{#if gridlines}
				<line
					class="gridline"
					stroke={isZero ? zeroValueStroke : stroke}
					stroke-dasharray={isZero ? 'none' : '3'}
					x2="100%"
					y1={isBandwidth ? $yScale.bandwidth() / 2 : 0}
					y2={isBandwidth ? $yScale.bandwidth() / 2 : 0}
				/>
			{/if}

			<!-- Zero line when gridlines disabled -->
			{#if isZero && !gridlines}
				<line
					{stroke}
					stroke-dasharray="5"
					x2="100%"
					y1={isBandwidth ? $yScale.bandwidth() / 2 : 0}
					y2={isBandwidth ? $yScale.bandwidth() / 2 : 0}
				/>
			{/if}

			<!-- Tick mark -->
			{#if tickMarks}
				<line
					class="tick-mark"
					x1="0"
					x2={isBandwidth ? -6 : 6}
					y1={isBandwidth ? $yScale.bandwidth() / 2 : 0}
					y2={isBandwidth ? $yScale.bandwidth() / 2 : 0}
				/>
			{/if}

			<!-- Tick label -->
			<text
				class="text-xxs font-light text-mid-warm-grey"
				class:hidden={isLastTick && !showLastTick}
				fill={textFill}
				x={xTick}
				y={isBandwidth ? $yScale.bandwidth() / 2 + yTick : yTick}
				dx={isBandwidth ? -9 : dxTick}
				dy={isBandwidth ? 4 : dyTick}
				style="text-anchor: {isBandwidth ? 'end' : textAnchor};"
			>
				{formatTick(tick)}
			</text>
		</g>
	{/each}
</g>
