<script>
	import { getContext } from 'svelte';

	const { xGet, height } = getContext('LayerCake');

	/** @type {*[]} */
	export let dataset = [];

	/** @type {string} [fill='#00e047'] - The shape's fill colour. */
	export let fill = '#00e047';

	/** @type {string} [stroke='#000'] - The shape's stroke colour. */
	export let stroke = '#000';

	/** @type {number} [strokeWidth=0] - The shape's stroke width. */
	export let strokeWidth = 0;

	export let clipPathId = '';

	$: columnWidth = (/** @type {*} */ d) => {
		const vals = $xGet({ date: d });
		return Math.abs(vals[1] - vals[0]);
	};
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
