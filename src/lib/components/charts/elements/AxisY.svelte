<script>
	import { getContext } from 'svelte';

	const { padding, xRange, yScale } = getContext('LayerCake');

	/** @type {boolean} Extend lines from the ticks into the chart. d */
	export let gridlines = true;

	/** @type {boolean} Show a vertical mark for each tick. */
	export let tickMarks = false;

	/** @type {string} [stroke='#efefef'] - The gridline's stroke colour. */
	export let stroke = '#efefef';

	/** @type {string} [fill='#666'] - The text's fill colour. */
	export let textFill = '#666';

	export let clipPathId = '';

	/** @type {Function} A function that passes the current tick value and expects a nicely formatted value in return. */
	export let formatTick = (/** @type {*} */ d) => d;

	/** @type {*}
	 * If this is a number, it passes that along to the [d3Scale.ticks](https://github.com/d3/d3-scale) function.
	 * If this is an array, hardcodes the ticks to those values.
	 * If it's a function, passes along the default tick values and expects an array of tick values in return.
	 */
	export let ticks = 4;

	/** @type {number} How far over to position the text marker. */
	export let xTick = 0;

	/** @type {number} How far up and down to position the text marker.  */
	export let yTick = 0;

	/** @type {number} Any optional value passed to the `dx` attribute on the text marker and tick mark (if visible). This is ignored on the text marker if your scale is ordinal. */
	export let dxTick = 0;

	/** @type {number} Any optional value passed to the `dy` attribute on the text marker and tick mark (if visible). This is ignored on the text marker if your scale is ordinal. */
	export let dyTick = -4;

	/** @type {string} CSS 'text-anchor' passed to the label. */
	export let textAnchor = 'start';

	$: isBandwidth = typeof $yScale.bandwidth === 'function';

	$: tickVals = Array.isArray(ticks)
		? ticks
		: isBandwidth
		? $yScale.domain()
		: typeof ticks === 'function'
		? ticks($yScale.ticks())
		: $yScale.ticks(ticks);
</script>

<g
	class="axis y-axis pointer-events-none"
	transform="translate({-$padding.left}, 0)"
	clip-path={clipPathId ? `url(#${clipPathId})` : ''}
>
	{#each tickVals as tick, i (i)}
		<g
			class="tick tick-{tick}"
			transform="translate({$xRange[0] + (isBandwidth ? $padding.left : 0)}, {$yScale(tick)})"
		>
			{#if gridlines !== false}
				<line
					class="gridline"
					{stroke}
					stroke-dasharray={tick === 0 ? '5' : '3'}
					x2="100%"
					y1={isBandwidth ? $yScale.bandwidth() / 2 : 0}
					y2={isBandwidth ? $yScale.bandwidth() / 2 : 0}
				/>
			{/if}
			{#if tick === 0 && gridlines == false}
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
