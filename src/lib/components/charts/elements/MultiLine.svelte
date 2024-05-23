<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import { draw } from 'svelte/transition';

	const { data, xGet, yGet, zGet } = getContext('LayerCake');
	const dispatch = createEventDispatcher();

	/** @type {TimeSeriesData | undefined} */
	export let hoverData = undefined;

	export let strokeWidth = '4px';

	export let opacity = 1;

	export let drawDurationObject = { duration: 250, delay: 0 };

	//TODO: refactor transition
	let show = false;
	setTimeout(() => {
		show = true;
	}, 100);

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

	$: console.log('updatedData', updatedData);
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
	{#each updatedData as group}
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
