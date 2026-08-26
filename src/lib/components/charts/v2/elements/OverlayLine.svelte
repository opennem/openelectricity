<script>
	/**
	 * OverlayLine — a line drawn above the stack from an independently-fetched
	 * row set (e.g. operational demand over the generation stack, or the
	 * official renewable share). `scale: 'y'` plots against the chart's value
	 * scale; `scale: 'percent'` plots against a fixed 0–100% scale spanning the
	 * same pixel range, with optional right-edge percentage tick labels.
	 *
	 * Must be rendered inside a LayerCake context.
	 */
	import { getContext } from 'svelte';
	import { line as d3Line, curveLinear } from 'd3-shape';
	import { scaleLinear } from 'd3-scale';

	const { xScale, yScale, width } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {any[]} dataset - Rows with `time` and the value key
	 * @property {string} valueKey
	 * @property {string} [colour]
	 * @property {number} [strokeWidth]
	 * @property {'y' | 'percent'} [scale]
	 * @property {boolean} [showAxis] - Right-edge % tick labels (percent scale)
	 * @property {any} [curveType] - d3 curve factory, matching the host chart
	 */

	/** @type {Props} */
	let {
		dataset = [],
		valueKey,
		colour = '#C74523',
		strokeWidth = 1.5,
		scale = 'y',
		showAxis = false,
		curveType = curveLinear
	} = $props();

	/** Upper bound of the percent scale — 100 normally, extended in 20% steps
	 *  when the data exceeds it (e.g. SA's renewable share tops 100% while
	 *  exporting), so the line never clips. */
	let percentMax = $derived.by(() => {
		let max = 100;
		for (const row of dataset) {
			const val = row[valueKey];
			if (Number.isFinite(val) && val > max) max = val;
		}
		return Math.ceil(max / 20) * 20;
	});
	let percentScale = $derived(
		scaleLinear()
			.domain([0, percentMax])
			.range($yScale?.range?.() ?? [0, 1])
	);
	let y = $derived(scale === 'percent' ? percentScale : $yScale);

	let path = $derived.by(() => {
		if (!dataset.length || !$xScale || !y) return '';
		const gen = d3Line()
			.defined((/** @type {any} */ d) => Number.isFinite(d[valueKey]))
			.x((/** @type {any} */ d) => $xScale(d.time))
			.y((/** @type {any} */ d) => y(d[valueKey]))
			.curve(curveType ?? curveLinear);
		return gen(/** @type {any} */ (dataset)) || '';
	});

	/** 20% steps up to (but excluding) the bound, so the top label never
	 *  crowds the chart's upper edge. */
	let percentTicks = $derived(
		Array.from({ length: Math.max(1, Math.floor(percentMax / 20)) }, (_, i) => i * 20)
	);
</script>

{#if path}
	<path d={path} fill="none" stroke={colour} stroke-width={strokeWidth} pointer-events="none" />
{/if}

{#if scale === 'percent' && showAxis}
	{#each percentTicks as tick (tick)}
		<text
			x={$width - 4}
			y={percentScale(tick)}
			dy="-3"
			text-anchor="end"
			font-size="10"
			class="fill-mid-grey"
			pointer-events="none"
		>
			{tick}%
		</text>
	{/each}
{/if}
