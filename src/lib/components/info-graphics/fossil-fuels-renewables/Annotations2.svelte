<script>
	import { getContext } from 'svelte';
	import { format as formatD3 } from 'd3-format';
	import { format as formatDate } from 'date-fns';

	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData | *} annotation
	 * @property {StatsData[]} dataset
	 * @property {boolean} [rounded]
	 * @property {boolean} [showBesideLatestPoint]
	 * @property {any} [seriesLabels]
	 * @property {Date | number} [time]
	 */

	/** @type {Props} */
	let {
		annotation,
		dataset,
		rounded = false,
		showBesideLatestPoint = false,
		seriesLabels = {},
		time
	} = $props();

	const { data, xGet, yGet, zGet } = getContext('LayerCake');
	const formatY = formatD3('.1f');

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

	let classes = $derived(
		showBesideLatestPoint
			? 'flex items-start gap-12 absolute right-12 -top-24'
			: 'flex items-start justify-end gap-28 absolute bottom-[-100px] w-full px-12'
	);

	let getStyles = $derived((/** @type {TimeSeriesData[]} */ values) =>
		showBesideLatestPoint ? `` : `bottom: -100px; left: 0`
	);
</script>

<div class={classes}>
	<div class="">
		{#if time}
			<div class="text-xs font-light hidden md:block">
				{formatDate(time, 'MMM yyyy')}
			</div>
		{:else}
			<div class="text-xs font-light">Average for the last 12 months</div>
		{/if}
	</div>
	{#each $data as group}
		<div style={getStyles(group.values)}>
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
