<script>
	import { getContext } from 'svelte';

	const { padding, xRange, yScale, xScale } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {boolean} [gridlines]
	 * @property {boolean} [tickMarks]
	 * @property {string} [stroke]
	 * @property {string} [textFill]
	 * @property {string} [clipPathId]
	 * @property {Function} [formatTick]
	 * @property {*} [ticks]
	 * @property {number} [xTick]
	 * @property {number} [yTick]
	 * @property {number} [dxTick]
	 * @property {number} [dyTick]
	 * @property {string} [textAnchor]
	 * @property {any} [yLabelStartPos]
	 * @property {string} [zeroValueStroke]
	 */

	/** @type {Props} */
	let {
		gridlines = true,
		tickMarks = false,
		stroke = '#efefef',
		textFill = '#666',
		clipPathId = '',
		formatTick = (/** @type {*} */ d) => d,
		ticks = 4,
		xTick = 0,
		yTick = 0,
		dxTick = 0,
		dyTick = -4,
		textAnchor = 'start',
		yLabelStartPos = null,
		zeroValueStroke = '#353535'
	} = $props();

	let isBandwidth = $derived(typeof $yScale.bandwidth === 'function');

	let xStart = $derived(
		yLabelStartPos ? $xScale(yLabelStartPos) : $xRange[0] + (isBandwidth ? $padding.left : 0)
	);
	// $: x2 = $xScale($xRange[0]);

	let tickVals = $derived(
		Array.isArray(ticks)
			? ticks
			: isBandwidth
				? $yScale.domain()
				: typeof ticks === 'function'
					? ticks($yScale.ticks())
					: $yScale.ticks(ticks)
	);
</script>

<g
	class="axis y-axis pointer-events-none"
	transform="translate({-$padding.left}, 0)"
	clip-path={clipPathId ? `url(#${clipPathId})` : ''}
>
	{#each tickVals as tick, i (i)}
		<g class="tick tick-{tick}" transform="translate({xStart}, {$yScale(tick)})">
			{#if gridlines === true}
				<line
					class="gridline"
					stroke={tick === 0 ? zeroValueStroke : stroke}
					stroke-dasharray={tick === 0 ? 'none' : '3'}
					x2="100%"
					y1={isBandwidth ? $yScale.bandwidth() / 2 : 0}
					y2={isBandwidth ? $yScale.bandwidth() / 2 : 0}
				/>
			{/if}
			{#if tick === 0 && gridlines === false}
				<line
					{stroke}
					stroke-dasharray="5"
					x2="100%"
					y1={isBandwidth ? $yScale.bandwidth() / 2 : 0}
					y2={isBandwidth ? $yScale.bandwidth() / 2 : 0}
				/>
			{/if}
			{#if tickMarks === true}
				<line
					class="tick-mark"
					x1="0"
					x2={isBandwidth ? -6 : 6}
					y1={isBandwidth ? $yScale.bandwidth() / 2 : 0}
					y2={isBandwidth ? $yScale.bandwidth() / 2 : 0}
				/>
			{/if}
			<text
				class="text-xxs font-light text-mid-warm-grey"
				fill={textFill}
				x={xTick}
				y={isBandwidth ? $yScale.bandwidth() / 2 + yTick : yTick}
				dx={isBandwidth ? -9 : dxTick}
				dy={isBandwidth ? 4 : dyTick}
				style="text-anchor:{isBandwidth ? 'end' : textAnchor};"
			>
				{formatTick(tick)}
			</text>
		</g>
	{/each}
</g>
