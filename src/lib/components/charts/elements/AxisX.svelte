<script>
	import { getContext } from 'svelte';
	const { width, height, xScale, yRange } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {boolean} [gridlines]
	 * @property {boolean} [tickMarks]
	 * @property {boolean} [tickLabel]
	 * @property {boolean} [baseline]
	 * @property {boolean} [snapTicks]
	 * @property {string} [stroke]
	 * @property {string} [strokeArray]
	 * @property {string} [clipPathId]
	 * @property {Function} [formatTick]
	 * @property {*} [ticks]
	 * @property {number} [xTick]
	 * @property {number} [yTick]
	 * @property {'start' | 'middle' | 'end'} [textAnchorPosition]
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
		formatTick = (/** @type {*} */ d) => d,
		ticks = undefined,
		xTick = 0,
		yTick = 16,
		textAnchorPosition = 'middle'
	} = $props();

	let isBandwidth = $derived(typeof $xScale.bandwidth === 'function');

	let tickVals = $derived(
		Array.isArray(ticks)
			? ticks
			: isBandwidth
				? $xScale.domain()
				: typeof ticks === 'function'
					? ticks($xScale.ticks())
					: $xScale.ticks(ticks)
	);

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
		return textAnchorPosition;
	}
</script>

<g
	class="axis x-axis pointer-events-none"
	class:snapTicks
	clip-path={clipPathId ? `url(#${clipPathId})` : ''}
>
	<rect class="axis-background" x="0" y={$height} width={$width} height={20} fill="transparent" />
	{#each tickVals as tick, i (tick)}
		<g class="tick tick-{i}" transform="translate({$xScale(tick)}, {Math.max(...$yRange)})">
			<!-- stroke={i === 0 || i === tickVals.length - 1 ? '#F1F0ED' : stroke}
					stroke-dasharray={i === 0 || i === tickVals.length - 1 ? 'none' : strokeArray} -->

			{#if gridlines === true}
				<line
					class="gridline"
					{stroke}
					stroke-dasharray={strokeArray}
					y1={$height * -1}
					y2="0"
					x1="0"
					x2="0"
				/>
			{/if}

			{#if tickMarks === true}
				<line
					class="tick-mark"
					stroke="black"
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
					dx="0"
					dy="2"
					text-anchor={textAnchor(i)}
					class="text-xxs font-light text-mid-warm-grey"
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
</style>
