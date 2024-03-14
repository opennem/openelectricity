<script>
	import { getContext } from 'svelte';

	const { data, xGet, yGet, zGet } = getContext('LayerCake');

	/** @type {TimeSeriesData[]} */
	export let dataset = [];

	/** @type {TimeSeriesData | undefined} */
	export let hoverData = undefined;

	$: cx = hoverData ? $xGet({ data: { ...hoverData } }) : 0;
	$: cy = (d) => {
		if (!hoverData) return 0;

		const find = d.find((item) => item.data.time === hoverData.time);

		return find ? $yGet(find)[1] : 0;
	};

	$: r = (d) => {
		if (!hoverData) return 0;

		const find = d.find((item) => item.data.time === hoverData.time);
		const hasData = Boolean(find && find.data[d.key]);

		return hasData ? 6 : 0;
	};
</script>

{#if hoverData}
	{#each $data as d}
		<circle {cx} cy={cy(d)} r={r(d)} stroke="white" fill={$zGet(d)} />
	{/each}
{/if}
