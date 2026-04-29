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

	// Build the SVG path by walking the points and splitting into separate
	// `M…L…` segments wherever y is null/undefined/NaN. A single naive
	// `M0,undefined L…` string makes the whole path invalid and the line
	// disappears, so any series with a missing value would silently vanish
	// (rolling-sum + raw mode can produce these gaps).
	let path = $derived((/** @type {any[]} */ values) => {
		const segments = [];
		let current = '';
		for (const d of values) {
			const y = $yGet(d);
			if (y == null || Number.isNaN(y)) {
				if (current) {
					segments.push(current);
					current = '';
				}
				continue;
			}
			const point = `${$xGet(d)},${y}`;
			current = current ? `${current}L${point}` : `M${point}`;
		}
		if (current) segments.push(current);
		return segments.join(' ');
	});

	let updatedData = $derived(
		hoverData
			? $data.map((/** @type {any} */ d) => {
					const time = hoverData.time;
					return {
						group: d.group,
						values: d.values.filter((/** @type {any} */ v) => v.time <= time)
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
