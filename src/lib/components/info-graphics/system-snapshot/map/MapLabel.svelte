<!-- @migration-task Error while migrating Svelte code: Can't migrate code with afterUpdate. Please migrate by hand. -->
<script>
	import { afterUpdate } from 'svelte';

	/** @type {string | number | undefined} */
	export let text = '';
	export let colour = '#ffffff';
	export let x = 0;
	export let y = 0;
	export let bg = false;
	export let textAnchor = 'middle';

	const HGAP = 12;
	const VGAP = 6;

	/** @type {SVGTextElement} */
	let textElement;

	/** @type {DOMRect | null} */
	let textBounds = null;

	afterUpdate(() => {
		textBounds = textElement ? textElement.getBBox() : null;
	});
</script>

<g transform={`translate(${x}, ${y})`} class="pointer-events-none">
	{#if bg && textBounds}
		<rect
			rx="3"
			fill="white"
			width={textBounds.width + HGAP}
			height={textBounds.height + VGAP}
			x={textBounds.x - HGAP / 2}
			y={textBounds.y - VGAP / 2}
		/>
	{/if}
	<text
		text-anchor={textAnchor}
		font-family="DM Sans"
		font-weight="600"
		fill={colour}
		class="text-sm md:text-xs"
		class:bg
		bind:this={textElement}
		x={bg ? HGAP / 2 : 0}
		y={bg ? VGAP / 2 : 0}
	>
		{text}
	</text>
</g>
