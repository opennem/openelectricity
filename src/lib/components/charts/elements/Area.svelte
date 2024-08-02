<script>
	import { getContext } from 'svelte';

	const { data, xGet, yGet, xScale, yScale, extents } = getContext('LayerCake');

	/** @type {string} shape fill colour */
	export let fill = 'transparent';

	export let clipPathId = '';

	$: path =
		'M' + $data.map((/** @type {number|string} */ d) => `${$xGet(d)},${$yGet(d)}`).join('L');

	let area = '';

	// TODO need to check for .defined values
	$: {
		const yRange = $yScale.range();
		area =
			path +
			('L' +
				$xScale($extents.x ? $extents.x[1] : 0) +
				',' +
				yRange[0] +
				'L' +
				$xScale($extents.x ? $extents.x[0] : 0) +
				',' +
				yRange[0] +
				'Z');
	}
</script>

<g class="area-group" role="group" clip-path={clipPathId ? `url(#${clipPathId})` : ''}>
	<path class="path-area" d={area} {fill} />
</g>
