<script>
	import { getContext } from 'svelte';
	import { format } from 'd3-format';

	/** @type {TimeSeriesData} */
	export let annotation;

	/** @type {StatsData[]} */
	export let dataset;

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
		const find = dataset.find((d) => d.id === group.group);
		return find ? find.label : '';
	};

	$: getValue = (/** @type {TimeSeriesGroupData} */ group) => {
		if (!annotation) return 0;
		const value = /** @type {number} */ (annotation[group.group]);
		return formatY(value);
	};
</script>

{#each $data as group}
	<div
		class="absolute"
		style="
      top:{top(group.values) - 9}px;
      left:{left(group.values) + 10}px;
    "
	>
		<div class="flex items-center gap-4">
			<span class="w-5 h-5 bg-black block" style="background-color: {$zGet(group)}" />
			<span class="uppercase font-space font-semibold text-xs text-mid-grey">{label(group)}</span>
		</div>

		<div class="flex items-baseline gap-1">
			<span class="text-2xl font-semibold">
				{getValue(group)}
			</span>
			<span class="text-lg">%</span>
		</div>
	</div>
{/each}
