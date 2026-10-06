<script>
	/**
	 * OverlayLine — a line drawn above the stack from an independently-fetched
	 * row set (e.g. operational demand over the generation stack, or the
	 * official renewable share). `scale: 'y'` plots against the chart's value
	 * scale; `scale: 'percent'` plots against an independent percentage scale
	 * spanning the same pixel range, with optional right-edge tick labels.
	 * With `onmousemove`, an invisible `hitWidth` stroke along the line takes the
	 * pointer and reports the row under it, as StackedArea's paths do; the
	 * drawn line stays pointer-transparent.
	 *
	 * Must be rendered inside a LayerCake context.
	 */
	import { getContext } from 'svelte';
	import { line as d3Line, curveLinear } from 'd3-shape';
	import { scaleLinear } from 'd3-scale';
	import { perfSpan } from '../perf.js';
	import { bisectTimeRight, nearestIndexOfTime } from '../binary-search.js';
	import { percentAxisTicks } from './percent-axis.js';

	const { xScale, yScale, width } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {any[]} dataset - Rows with `time` and the value key
	 * @property {string} valueKey
	 * @property {string} [colour]
	 * @property {number} [strokeWidth]
	 * @property {string} [dasharray] - SVG stroke-dasharray, e.g. '4 3' for a reference line
	 * @property {'y' | 'percent'} [scale]
	 * @property {boolean} [showAxis] - Right-edge % tick labels (percent scale)
	 * @property {any} [curveType] - d3 curve factory, matching the host chart
	 * @property {boolean} [stepMode] - Floor-based row lookup, as for step curves
	 * @property {number} [hitWidth] - Pointer target width (px) when hoverable
	 * @property {(row: any) => void} [onmousemove] - Makes the line hoverable
	 * @property {() => void} [onmouseout]
	 * @property {(row: any) => void} [onpointerup]
	 */

	/** @type {Props} */
	let {
		dataset = [],
		valueKey,
		colour = '#C74523',
		strokeWidth = 1.5,
		dasharray = undefined,
		scale = 'y',
		showAxis = false,
		curveType = curveLinear,
		stepMode = false,
		hitWidth = 8,
		onmousemove = undefined,
		onmouseout = undefined,
		onpointerup = undefined
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

	// Reuse one generator and reset its accessors for each path.
	const lineGen = d3Line();

	let path = $derived.by(() => {
		if (!dataset.length || !$xScale || !y) return '';
		return perfSpan('chart:overlay-line', () => {
			const yScale = y;
			lineGen
				.defined((/** @type {any} */ d) => Number.isFinite(d[valueKey]))
				.x((/** @type {any} */ d) => $xScale(d.time))
				.y((/** @type {any} */ d) => yScale(d[valueKey]))
				.curve(curveType ?? curveLinear);
			return lineGen(/** @type {any} */ (dataset)) || '';
		});
	});

	/** The row under the pointer: the active step's, else the nearest.
	 *  @param {MouseEvent} event */
	function rowAt(event) {
		const time = $xScale.invert(event.offsetX).getTime();
		const index = stepMode ? bisectTimeRight(dataset, time) - 1 : nearestIndexOfTime(dataset, time);
		return dataset[index];
	}

	/** @param {MouseEvent} event */
	function handlePointerUp(event) {
		// Cmd/Ctrl+click is used for zoom — don't trigger focus
		if (event.metaKey || event.ctrlKey) return;
		const row = rowAt(event);
		if (row) onpointerup?.(row);
	}

	/** 20% steps for ordinary ranges; adaptive, bounded ticks for extreme
	 *  domains. The top label stays omitted so it never crowds the chart edge. */
	let percentTicks = $derived(percentAxisTicks(percentMax));
</script>

{#if path}
	<path
		d={path}
		class="overlay-line"
		fill="none"
		stroke={colour}
		stroke-width={strokeWidth}
		stroke-dasharray={dasharray}
		pointer-events="none"
	/>
	{#if onmousemove}
		<path
			d={path}
			role="presentation"
			fill="none"
			stroke="transparent"
			stroke-width={hitWidth}
			pointer-events="stroke"
			onmousemove={(event) => {
				const row = rowAt(event);
				if (row) onmousemove(row);
			}}
			onmouseout={() => onmouseout?.()}
			onblur={() => onmouseout?.()}
			onpointerup={handlePointerUp}
		/>
	{/if}
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
			stroke="white"
			stroke-width="3"
			style="paint-order: stroke fill;"
			pointer-events="none"
		>
			{tick}%
		</text>
	{/each}
{/if}
