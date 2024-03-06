<!--
  @component
  Generates an SVG column chart.
 -->
<script>
	import { getContext } from 'svelte';

	const { data, xGet, height } = getContext('LayerCake');

	export let dataset = [];

	/** @type {String} [fill='#00e047'] - The shape's fill colour. */
	export let fill = '#00e047';

	/** @type {String} [stroke='#000'] - The shape's stroke colour. */
	export let stroke = '#000';

	/** @type {Number} [strokeWidth=0] - The shape's stroke width. */
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
