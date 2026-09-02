<script>
	/**
	 * HatchOverlay Component
	 *
	 * Renders a hatched rectangle overlay from a start time to an optional end
	 * time (otherwise the chart edge). Used for projections and incomplete
	 * current buckets. Must be inside a LayerCake context.
	 */
	import { getContext } from 'svelte';
	import HatchPattern from '$lib/components/charts/elements/defs/HatchPattern.svelte';

	const { xScale, width, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {number} startTime - Start time in ms for the overlay
	 * @property {number} [endTime] - Optional end time in ms
	 * @property {string} [patternId] - ID for the hatch pattern def
	 * @property {string} [patternTransform] - SVG transform controlling hatch direction
	 * @property {string} [bgFill] - Optional background fill behind the hatch
	 */

	/** @type {Props} */
	let {
		startTime,
		endTime,
		patternId = 'hatch-overlay-pattern',
		patternTransform = 'rotate(20)',
		bgFill = ''
	} = $props();

	let x = $derived($xScale ? $xScale(startTime) : 0);
	let endX = $derived(endTime == null || !$xScale ? $width : $xScale(endTime));
	let rectWidth = $derived(Math.max(0, endX - x));
</script>

<defs>
	<HatchPattern id={patternId} {patternTransform} />
</defs>

{#if rectWidth > 0}
	{#if bgFill}
		<rect {x} y={0} width={rectWidth} height={$height} fill={bgFill} pointer-events="none" />
	{/if}
	<rect
		{x}
		y={0}
		width={rectWidth}
		height={$height}
		fill="url(#{patternId})"
		pointer-events="none"
	/>
{/if}
