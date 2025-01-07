<script>
	import { getContext } from 'svelte';

	const { xGet, height } = getContext('LayerCake');

	

	

	

	

	/**
	 * @typedef {Object} Props
	 * @property {*[]} [dataset]
	 * @property {string} [fill]
	 * @property {string} [stroke]
	 * @property {number} [strokeWidth]
	 * @property {string} [clipPathId]
	 */

	/** @type {Props} */
	let {
		dataset = [],
		fill = '#00e047',
		stroke = '#000',
		strokeWidth = 0,
		clipPathId = ''
	} = $props();

	let columnWidth = $derived((/** @type {*} */ d) => {
		const vals = $xGet({ date: d });
		return Math.abs(vals[1] - vals[0]);
	});
</script>

<g>
	{#each dataset as d}
		<rect
			class="group-rect"
			x={$xGet({ date: d })[0]}
			y={0}
			width={columnWidth(d)}
			height={$height}
			{fill}
			{stroke}
			stroke-width={strokeWidth}
			clip-path={clipPathId ? `url(#${clipPathId})` : ''}
		/>
	{/each}
</g>
