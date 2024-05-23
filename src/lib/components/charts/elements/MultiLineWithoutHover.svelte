<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import { draw } from 'svelte/transition';

	const { data, xGet, yGet, zGet, xScale, x } = getContext('LayerCake');
	const dispatch = createEventDispatcher();

	export let strokeWidth = '4px';

	export let opacity = 1;

	export let drawDurationObject = { duration: 0, delay: 0 };

	//TODO: refactor transition
	let show = false;
	setTimeout(() => {
		show = true;
	}, 100);

	$: path = (values) => {
		return values.length
			? 'M' +
					values
						.map((d) => {
							// console.log('d', $x(d.date), $xScale(d));
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
		{#if show}
			<path
				transition:draw={drawDurationObject}
				class="path-line"
				d={path(group.values)}
				stroke={$zGet(group)}
				stroke-width={strokeWidth}
				style="opacity: {opacity};"
			/>
		{/if}
	{/each}
</g>

<style>
	.path-line {
		fill: none;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
</style>
