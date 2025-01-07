<script>
	import { getContext } from 'svelte';
	import { format } from 'd3-format';

	

	



	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData} annotation
	 * @property {StatsData[]} dataset
	 * @property {boolean} [rounded]
	 * @property {boolean} [showBesideLatestPoint]
	 * @property {any} [seriesLabels]
	 */

	/** @type {Props} */
	let {
		annotation,
		dataset,
		rounded = false,
		showBesideLatestPoint = false,
		seriesLabels = {}
	} = $props();

	const { data, xGet, yGet, zGet } = getContext('LayerCake');
	const formatY = format('.1f');

	let left = $derived((/** @type {TimeSeriesData[]} */ values) => {
		const latest = values[values.length - 1];
		return $xGet(latest);
	});

	let top = $derived((/** @type {TimeSeriesData[]} */ values) => {
		const latest = values[values.length - 1];
		return $yGet(latest);
	});

	let label = $derived((/** @type {TimeSeriesGroupData} */ group) => {
		return seriesLabels[group.group];
	});

	let getValue = $derived((/** @type {TimeSeriesGroupData} */ group) => {
		if (!annotation) return 0;
		const value = /** @type {number} */ (annotation[group.group]);
		return formatY(value);
	});

	let classes = $derived(showBesideLatestPoint
		? ''
		: 'flex items-center justify-center gap-28 absolute bottom-[-100px] w-full px-12');

	let getStyles = $derived((/** @type {TimeSeriesData[]} */ values) =>
		showBesideLatestPoint
			? `top: ${top(values) - 9}px; left: ${left(values) + 10}px;`
			: `bottom: -100px; left: 0`);
</script>

<div class={classes}>
	{#each $data as group}
		<div class:absolute={showBesideLatestPoint} style={getStyles(group.values)}>
			<div class="flex items-center gap-4">
				<span
					class="w-5 h-5 bg-black block"
					class:rounded-full={rounded}
					style="background-color: {$zGet(group)}"
				></span>
				<span
					class="whitespace-nowrap uppercase font-space font-semibold text-sm md:text-xs text-mid-grey"
				>
					{label(group)}
				</span>
			</div>

			<div class="flex items-baseline gap-1">
				<span class="text-2xl font-semibold">
					{getValue(group)}
				</span>
				<span class="text-lg">%</span>
			</div>
		</div>
	{/each}
</div>
