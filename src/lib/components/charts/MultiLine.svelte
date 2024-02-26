<script>
	import { getContext, createEventDispatcher } from 'svelte';

	const { data, xGet, yGet, zGet } = getContext('LayerCake');
	const dispatch = createEventDispatcher();

	/** @type {TimeSeriesData | undefined} */
	export let hoverData = undefined;

	export let opacity = 1;

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
		const time = hoverData.time;
		const find = values.find((item) => item.time === time);
		return $xGet(find);
	};
	$: cy = (values) => {
		if (!hoverData) return 0;
		const time = hoverData.time;
		const find = values.find((item) => item.time === time);
		return $yGet(find);
	};

	$: updatedData = hoverData
		? $data.map((d) => {
				const time = hoverData.time;
				return {
					group: d.group,
					values: d.values.filter((v) => v.time <= time)
				};
		  })
		: $data;
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
	{#each updatedData as group}
		<path
			class="path-line"
			d={path(group.values)}
			stroke={$zGet(group)}
			style="opacity: {opacity};"
		/>
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
