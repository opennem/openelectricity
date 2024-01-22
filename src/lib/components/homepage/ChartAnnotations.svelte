<script>
	import { getContext } from 'svelte';
	import { format } from 'd3-format';

	export let annotation;
	export let dataset;

	const { data, y, xGet, yGet, zGet } = getContext('LayerCake');
	const formatY = format('.1f');

	$: console.log('annotation', annotation, dataset);

	$: left = (values) => {
		const latest = values[values.length - 1];

		return $xGet(latest);
	};
	$: top = (values) => {
		const latest = values[values.length - 1];

		return $yGet(latest);
	};

	$: label = (group) => {
		const find = dataset.find((d) => d.id === group.group);
		return find ? find.label : '';
	};

	$: value = (values) => {
		const latest = values[values.length - 1];
		return $y(latest);
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

		<span class="text-2xl font-semibold">
			{formatY(value(group.values))}%
		</span>
	</div>
{/each}
