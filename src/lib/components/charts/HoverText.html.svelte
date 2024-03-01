<script>
	import { getContext } from 'svelte';

	const { xGet, width, height } = getContext('LayerCake');

	/** @type {TimeSeriesData | undefined} */
	export let hoverData = undefined;

	export let isShapeStack = false;

	/** @type {'top' | 'bottom'} */
	export let position = 'top';

	let visible = false;
	let x = 0;
	let style = '';

	/** @type {HTMLElement} */
	let textContainer;

	$: if (hoverData) {
		updateCoords(hoverData);
		visible = true;
	} else {
		visible = false;
	}

	/**
	 * @param {TimeSeriesData} d
	 */
	function updateCoords(d) {
		const data = { date: d.date };
		x = isShapeStack ? $xGet({ data }) : $xGet(data);

		const textOffsetWidth = textContainer?.offsetWidth;
		let left = x - textOffsetWidth / 2;

		// snap to the left or right if the text would go off the chart
		if (left < 0) {
			left = 0;
		} else if (x > $width - textOffsetWidth / 2) {
			left = $width - textOffsetWidth;
		}

		if (position === 'top') {
			style = `left: ${left}px; top: -2rem`;
		} else {
			style = `left: ${left}px; top: ${$height + 5}px`;
		}
	}
</script>

{#if visible}
	<div class="absolute" {style} bind:this={textContainer}>
		<slot />
	</div>
{/if}
