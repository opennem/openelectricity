<script>
	import { getContext } from 'svelte';
	import { area } from 'd3-shape';

	const { data, xGet, yGet, yScale } = getContext('LayerCake');

	

	/**
	 * @typedef {Object} Props
	 * @property {string} [fill]
	 * @property {string} [clipPathId]
	 */

	/** @type {Props} */
	let { fill = 'transparent', clipPathId = '' } = $props();

	let areaPath = $derived(area()
		.x($xGet)
		.y1($yGet)
		.y0(() => $yScale(0))
		.defined((d) => !isNaN($yGet(d))));
</script>

<g class="area-group" role="group" clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
	<path class="path-area" d={areaPath($data)} {fill} />
</g>
