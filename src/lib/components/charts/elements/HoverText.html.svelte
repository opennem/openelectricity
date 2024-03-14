<script>
	import { getContext } from 'svelte';

	const { xGet, height } = getContext('LayerCake');

	/** @type {TimeSeriesData | undefined} */
	export let hoverData = undefined;

	export let isShapeStack = false;

	/** @type {'top' | 'bottom'} */
	export let position = 'top';

	let visible = false;
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
		const x = isShapeStack ? $xGet({ data }) : $xGet(data);

		const textOffsetWidth = textContainer?.clientWidth;
		const textOffsetHeight = textContainer?.clientHeight;
		const left = x - textOffsetWidth / 2;

		if (position === 'top') {
			style = `left: ${left}px; top: -${textOffsetHeight}px`;
		} else {
			style = `left: ${left}px; top: ${$height + 5}px`;
		}
	}
</script>

{#if visible}
	<div class="absolute whitespace-nowrap" {style} bind:this={textContainer}>
		<slot />
	</div>
{/if}
