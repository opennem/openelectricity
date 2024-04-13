<script>
	import { afterUpdate } from 'svelte';

	/** @type {string | number | undefined} */
	export let text = '';
	export let colour = '#ffffff';
	export let x = 0;
	export let y = 0;
	export let bg = false;
	export let textAnchor = 'middle';

	const HGAP = 16;
	const VGAP = 8;

	let className = bg ? 'bg' : '';

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
			rx="4"
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
		font-size="16"
		fill={colour}
		class={className}
		bind:this={textElement}
		x={bg ? HGAP / 2 : 0}
		y={bg ? VGAP / 2 : 0}
	>
		{text}
	</text>
</g>
