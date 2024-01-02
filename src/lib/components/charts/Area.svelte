<script>
	import { getContext } from 'svelte';

	const { data, xGet, yGet, xScale, yScale, extents } = getContext('LayerCake');

	/** @type {string} shape fill colour */
	export let fill = '#ababab10';

	$: path = 'M' + $data.map((d) => `${$xGet(d)},${$yGet(d)}`).join('L');

	let area = '';

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

<path class="path-area" d={area} {fill} />
