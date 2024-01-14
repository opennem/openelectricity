<script>
	import { getContext } from 'svelte';
	import { arc } from 'd3-shape';

	const { data, xScale, width, height } = getContext('LayerCake');

	export let start = 0;
	export let end = 0;
	export let fill = 'darkorange';

	$: arcGen = arc()
		.innerRadius($width / 2.5)
		.outerRadius($width / 2)
		.padAngle(0.03)
		.startAngle($xScale(start))
		.endAngle($xScale(end));
</script>

<g class="arc-group" transform="translate({$width / 2}, {$height / 2})">
	<path d={arcGen($data)} {fill} />
</g>
