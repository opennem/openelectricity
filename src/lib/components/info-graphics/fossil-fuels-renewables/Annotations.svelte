<script>
	import { getContext } from 'svelte';
	import { format } from 'd3-format';

	/** @type {TimeSeriesData} */
	export let annotation;

	/** @type {StatsData[]} */
	export let dataset;

	export let rounded = false;

	export let showBesideLatestPoint = false;

	export let seriesLabels = {};

	const { data, xGet, yGet, zGet } = getContext('LayerCake');
	const formatY = format('.1f');

	$: left = (/** @type {TimeSeriesData[]} */ values) => {
		const latest = values[values.length - 1];
		return $xGet(latest);
	};

	$: top = (/** @type {TimeSeriesData[]} */ values) => {
		const latest = values[values.length - 1];
		return $yGet(latest);
	};

	$: label = (/** @type {TimeSeriesGroupData} */ group) => {
		return seriesLabels[group.group];
	};

	$: getValue = (/** @type {TimeSeriesGroupData} */ group) => {
		if (!annotation) return 0;
		const value = /** @type {number} */ (annotation[group.group]);
		return formatY(value);
	};

	$: classes = showBesideLatestPoint
		? ''
		: 'flex items-center justify-center gap-28 absolute bottom-[-100px] w-full px-12';

	$: getStyles = (/** @type {TimeSeriesData[]} */ values) =>
		showBesideLatestPoint
			? `top: ${top(values) - 9}px; left: ${left(values) + 10}px;`
			: `bottom: -100px; left: 0`;
</script>

<div class={classes}>
	{#each $data as group}
		<div class:absolute={showBesideLatestPoint} style={getStyles(group.values)}>
			<div class="flex items-center gap-4">
				<span
					class="w-5 h-5 bg-black block"
					class:rounded-full={rounded}
					style="background-color: {$zGet(group)}"
				/>
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
