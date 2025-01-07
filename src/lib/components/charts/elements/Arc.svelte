<script>
	import { getContext } from 'svelte';
	import { arc } from 'd3-shape';

	const { data, xScale, width, height } = getContext('LayerCake');

	/**
	 * @typedef {Object} Props
	 * @property {number} [start]
	 * @property {number} [end]
	 * @property {string} [fill]
	 */

	/** @type {Props} */
	let { start = 0, end = 0, fill = 'darkorange' } = $props();

	let arcGen = $derived(arc()
		.innerRadius($width / 2.5)
		.outerRadius($width / 2)
		.padAngle(0.03)
		.startAngle($xScale(start))
		.endAngle($xScale(end)));
</script>

<g class="arc-group" transform="translate({$width / 2}, {$height / 2})">
	<path d={arcGen($data)} {fill} />
</g>
