<script>
	import { run } from 'svelte/legacy';

	import { getContext, createEventDispatcher } from 'svelte';

	const { data, xGet, yGet, zGet } = getContext('LayerCake');
	const dispatch = createEventDispatcher();

	/**
	 * @typedef {Object} Props
	 * @property {string} [strokeWidth]
	 * @property {number} [opacity]
	 */

	/** @type {Props} */
	let { strokeWidth = '4px', opacity = 1 } = $props();

	let path = $derived((/** @type {any[]} */ values) => {
		return values.length
			? 'M' +
					values
						.map((/** @type {any} */ d) => {
							return $xGet(d) + ',' + $yGet(d);
						})
						.join('L')
			: '';
	});

	run(() => {
		console.log('$data', $data);
	});
</script>

<g
	class="line-group"
	role="group"
	onmouseout={() => {
		dispatch('mouseout');
	}}
	onblur={() => {
		dispatch('mouseout');
	}}
>
	{#each $data as group (group.group)}
		<path
			class="path-line"
			d={path(group.values)}
			stroke={$zGet(group)}
			stroke-width={strokeWidth}
			style="opacity: {opacity};"
		/>
	{/each}
</g>

<style>
	.path-line {
		fill: none;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
</style>
