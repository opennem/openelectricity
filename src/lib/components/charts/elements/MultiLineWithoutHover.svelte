<script>
	import { getContext, createEventDispatcher } from 'svelte';

	const { data, xGet, yGet, zGet } = getContext('LayerCake');
	const dispatch = createEventDispatcher();

	export let strokeWidth = '4px';

	export let opacity = 1;

	$: path = (values) => {
		return values.length
			? 'M' +
					values
						.map((d) => {
							return $xGet(d) + ',' + $yGet(d);
						})
						.join('L')
			: '';
	};

	$: console.log('$data', $data);
</script>

<g
	class="line-group"
	role="group"
	on:mouseout={() => {
		dispatch('mouseout');
	}}
	on:blur={() => {
		dispatch('mouseout');
	}}
>
	{#each $data as group}
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
