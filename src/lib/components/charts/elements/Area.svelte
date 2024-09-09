<script>
	import { getContext } from 'svelte';
	import { area } from 'd3-shape';

	const { data, xGet, yGet, yScale } = getContext('LayerCake');

	/** @type {string} shape fill colour */
	export let fill = 'transparent';

	export let clipPathId = '';

	$: areaPath = area()
		.x($xGet)
		.y1($yGet)
		.y0(() => $yScale(0))
		.defined((d) => !isNaN($yGet(d)));
</script>

<g class="area-group" role="group" clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
	<path class="path-area" d={areaPath($data)} {fill} />
</g>
