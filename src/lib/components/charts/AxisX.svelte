<script>
	import { getContext } from 'svelte';
	const { width, height, xScale, yRange } = getContext('LayerCake');

	/** @type {boolean} Extend lines from the ticks into the chart. d */
	export let gridlines = true;

	/** @type {boolean} Show a vertical mark for each tick. */
	export let tickMarks = false;

	/** @type {boolean} Show the label for each tick. */
	export let tickLabel = true;

	/** @type {boolean} Show a solid line at the bottom. */
	export let baseline = false;

	/** @type {boolean} Instead of centering the text on the first and the last items, align them to the edges of the chart. */
	export let snapTicks = false;

	/** @type {string} [stroke='#000'] - The gridline's stroke colour. */
	export let stroke = '#efefef';

	export let clipPathId = '';

	/** @type {Function} A function that passes the current tick value and expects a nicely formatted value in return. */
	export let formatTick = (/** @type {*} */ d) => d;

	/** @type {*}
	 * If this is a number, it passes that along to the [d3Scale.ticks](https://github.com/d3/d3-scale) function.
	 * If this is an array, hardcodes the ticks to those values.
	 * If it's a function, passes along the default tick values and expects an array of tick values in return.
	 * If nothing, it uses the default ticks supplied by the D3 function.
	 */
	export let ticks = undefined;

	/** @type {number} How far over to position the text marker. */
	export let xTick = 0;

	/** @type {number} The distance from the baseline to place each tick value.  */
	export let yTick = 16;

	$: isBandwidth = typeof $xScale.bandwidth === 'function';

	$: tickVals = Array.isArray(ticks)
		? ticks
		: isBandwidth
		? $xScale.domain()
		: typeof ticks === 'function'
		? ticks($xScale.ticks())
		: $xScale.ticks(ticks);

	/**
	 *
	 * @param {number} i
	 * @returns {'start'|'middle'|'end'}
	 */
	function textAnchor(i) {
		if (snapTicks === true) {
			if (i === 0) {
				return 'start';
			}
			if (i === tickVals.length - 1) {
				return 'end';
			}
		}
		return 'middle';
	}
</script>

<g
	class="axis x-axis pointer-events-none"
	class:snapTicks
	clip-path={clipPathId ? `url(#${clipPathId})` : ''}
>
	{#each tickVals as tick, i (tick)}
		<g class="tick tick-{i}" transform="translate({$xScale(tick)}, {Math.max(...$yRange)})">
			{#if gridlines !== false}
				<line class="gridline" {stroke} y1={$height * -1} y2="0" x1="0" x2="0" />
			{/if}

			{#if tickMarks === true}
				<line
					class="tick-mark"
					y1={0}
					y2={6}
					x1={isBandwidth ? $xScale.bandwidth() / 2 : 0}
					x2={isBandwidth ? $xScale.bandwidth() / 2 : 0}
				/>
			{/if}

			{#if tickLabel}
				<text
					x={isBandwidth ? $xScale.bandwidth() / 2 + xTick : xTick}
					y={yTick}
					dx=""
					dy=""
					text-anchor={textAnchor(i)}
				>
					{formatTick(tick)}
				</text>
			{/if}
		</g>
	{/each}

	{#if baseline === true}
		<line class="baseline" y1={$height + 0.5} y2={$height + 0.5} x1="0" x2={$width} />
	{/if}
</g>

<style>
	.tick {
		font-size: 10px;
		font-weight: 400;
	}
	line,
	.tick line {
		stroke-dasharray: 0;
	}

	.tick text {
		fill: #666;
	}

	.tick .tick-mark,
	.baseline {
		stroke-dasharray: 0;
	}

	.axis.snapTicks .tick:last-child text {
		transform: translateX(3px);
	}
	.axis.snapTicks .tick.tick-0 text {
		transform: translate(-3px);
	}
</style>
