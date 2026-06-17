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
	 * @property {string} [unit]
	 */

	/** @type {Props} */
	let {
		annotation,
		dataset,
		rounded = false,
		showBesideLatestPoint = false,
		seriesLabels = {},
		unit = '%'
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

	let classes = $derived(
		showBesideLatestPoint
			? ''
			: 'flex items-center justify-center gap-28 absolute bottom-[-100px] w-full px-12'
	);

	let getStyles = $derived((/** @type {TimeSeriesData[]} */ values) =>
		showBesideLatestPoint
			? `top: ${top(values) - 9}px; left: ${left(values) + 10}px;`
			: `bottom: -100px; left: 0`
	);

	// When hovering the projected region the readout follows the trend line at the
	// cursor (right-aligned, sitting just left of the point) instead of staying
	// anchored beside the latest real point.
	let isTrendHover = $derived(
		showBesideLatestPoint && !!(/** @type {any} */ (annotation)?.isTrend)
	);
</script>

{#snippet trendReadout(/** @type {TimeSeriesGroupData} */ group)}
	{@const x = $xGet({ date: /** @type {any} */ (annotation).date })}
	{@const y = $yGet({ value: /** @type {number} */ (annotation[group.group]) })}
	<div
		class="absolute flex flex-col items-end gap-0.5"
		style="left: {x - 10}px; top: {y}px; transform: translate(-100%, -50%);"
	>
		<div class="flex items-center gap-2">
			<span class="whitespace-nowrap uppercase font-space font-semibold text-xs text-mid-grey">
				{label(group)}
			</span>
			<span class="block h-3 w-3 rounded-full" style="background-color: {$zGet(group)}"></span>
		</div>
		<div class="flex items-baseline gap-1">
			<span class="text-xl font-semibold leading-none">{getValue(group)}</span>
			<span class="text-base leading-none">{unit}</span>
		</div>
	</div>
{/snippet}

{#snippet valueReadout(/** @type {TimeSeriesGroupData} */ group)}
	<!-- pl-9 lines the value up with the label text, not the circle (circle w-5 + gap-4 = 2.25rem). -->
	<div class="flex items-baseline gap-1 pl-9">
		<span class="text-2xl font-semibold leading-none">
			{getValue(group)}
		</span>
		<span class="text-lg leading-none">{unit}</span>
	</div>
{/snippet}

<div class={classes}>
	<!-- Beside the latest point, the upper line (Fossils, first series) floats its value
	     above the label while the lower line (Renewables) keeps it below, so the two
	     readouts don't crowd when the endpoints sit close together. The bottom-bar
	     layout (mobile) keeps both below. -->
	{#each $data as group, i (i)}
		{#if isTrendHover}
			{@render trendReadout(group)}
		{:else}
			{@const valueAbove = showBesideLatestPoint && i === 0}
			<div class:absolute={showBesideLatestPoint} style={getStyles(group.values)}>
				{#if valueAbove}
					<div class="absolute bottom-full left-0 pb-0.5">
						{@render valueReadout(group)}
					</div>
				{/if}

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

				{#if !valueAbove}
					{@render valueReadout(group)}
				{/if}
			</div>
		{/if}
	{/each}
</div>
