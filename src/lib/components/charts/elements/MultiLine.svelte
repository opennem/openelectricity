<script>
	import { getContext, createEventDispatcher } from 'svelte';
	import { draw } from 'svelte/transition';

	const { data, xGet, yGet, zGet } = getContext('LayerCake');
	const dispatch = createEventDispatcher();

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData | undefined} [hoverData]
	 * @property {string} [strokeWidth]
	 * @property {number} [opacity]
	 * @property {any} [drawDurationObject]
	 */

	/** @type {Props} */
	let {
		hoverData = undefined,
		strokeWidth = '4px',
		opacity = 1,
		drawDurationObject = { duration: 250, delay: 0 }
	} = $props();

	//TODO: refactor transition
	let show = $state(false);
	setTimeout(() => {
		show = true;
	}, 100);

	let path = $derived((values) => {
		return (
			'M' +
			values
				.map((d) => {
					return $xGet(d) + ',' + $yGet(d);
				})
				.join('L')
		);
	});

	let updatedData = $derived(
		hoverData
			? $data.map((d) => {
					const time = hoverData.time;
					return {
						group: d.group,
						values: d.values.filter((v) => v.time <= time)
					};
				})
			: $data
	);
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
	{#each updatedData as group (group.group)}
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
