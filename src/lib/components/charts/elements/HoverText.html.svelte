<script>
	import { run } from 'svelte/legacy';

	import { getContext } from 'svelte';

	const { xGet, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData | undefined} [hoverData]
	 * @property {boolean} [isShapeStack]
	 * @property {'top' | 'bottom'} [position]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let { hoverData = undefined, isShapeStack = false, position = 'top', children } = $props();

	let visible = $state(false);
	let style = $state('');

	/** @type {HTMLElement} */
	let textContainer = $state();

	/**
	 * @param {TimeSeriesData} d
	 */
	function updateCoords(d) {
		const data = { date: d.date };
		const x = isShapeStack ? $xGet({ data }) : $xGet(data);

		const textOffsetWidth = textContainer?.clientWidth;
		const textOffsetHeight = textContainer?.clientHeight;
		const left = x - textOffsetWidth / 2;

		if (position === 'top') {
			style = `left: ${left}px; top: -${textOffsetHeight}px`;
		} else {
			style = `left: ${left}px; top: ${$height + 7}px`;
		}
	}
	run(() => {
		if (hoverData) {
			updateCoords(hoverData);
			visible = true;
		} else {
			visible = false;
		}
	});
</script>

{#if visible}
	<div class="absolute whitespace-nowrap" {style} bind:this={textContainer}>
		{@render children?.()}
	</div>
{/if}
