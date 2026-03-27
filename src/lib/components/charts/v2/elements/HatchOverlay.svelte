<script>
	/**
	 * HatchOverlay Component
	 *
	 * Renders a hatched rectangle overlay from a start time to the end of the chart.
	 * Used for marking projection/forecast regions. Must be inside a LayerCake context.
	 */
	import { getContext } from 'svelte';
	import HatchPattern from '$lib/components/charts/elements/defs/HatchPattern.svelte';

	const { xScale, width, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {number} startTime - Start time in ms for the overlay
	 * @property {string} [patternId] - ID for the hatch pattern def
	 * @property {string} [bgFill] - Optional background fill behind the hatch
	 */

	/** @type {Props} */
	let { startTime, patternId = 'hatch-overlay-pattern', bgFill = '' } = $props();

	let x = $derived($xScale ? $xScale(startTime) : 0);
	let rectWidth = $derived(Math.max(0, $width - x));
</script>

<defs>
	<HatchPattern id={patternId} />
</defs>

{#if rectWidth > 0}
	{#if bgFill}
		<rect {x} y={0} width={rectWidth} height={$height} fill={bgFill} pointer-events="none" />
	{/if}
	<rect {x} y={0} width={rectWidth} height={$height} fill="url(#{patternId})" pointer-events="none" />
{/if}
