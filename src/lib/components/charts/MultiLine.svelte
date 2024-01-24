<script>
	import { getContext, createEventDispatcher } from 'svelte';

	const { data, xGet, yGet, zGet } = getContext('LayerCake');
	const dispatch = createEventDispatcher();

	/** @type {TimeSeriesData | undefined} */
	export let hoverData = undefined;

	$: path = (values) => {
		return (
			'M' +
			values
				.map((d) => {
					return $xGet(d) + ',' + $yGet(d);
				})
				.join('L')
		);
	};

	$: cx = (values) => {
		if (!hoverData) return 0;

		const find = values.find((item) => item.time === hoverData.time);

		return $xGet(find);
	};
	$: cy = (values) => {
		if (!hoverData) return 0;

		const find = values.find((item) => item.time === hoverData.time);

		return $yGet(find);
	};
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
	{#if hoverData}
		{#each $data as group}
			<circle cx={cx(group.values)} cy={cy(group.values)} r="6" fill={$zGet(group)} />
		{/each}
	{/if}
	{#each $data as group}
		<path class="path-line" d={path(group.values)} stroke={$zGet(group)} />
	{/each}
</g>

<style>
	.path-line {
		fill: none;
		stroke-linejoin: round;
		stroke-linecap: round;
		stroke-width: 4px;
	}
</style>
