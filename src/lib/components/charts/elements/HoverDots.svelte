<script>
	import { getContext } from 'svelte';

	const { data, xGet, yGet, zGet } = getContext('LayerCake');

	

	
	/**
	 * @typedef {Object} Props
	 * @property {TimeSeriesData[]} [dataset]
	 * @property {TimeSeriesData | undefined} [hoverData]
	 */

	/** @type {Props} */
	let { dataset = [], hoverData = undefined } = $props();

	let cx = $derived(hoverData ? $xGet({ data: { ...hoverData } }) : 0);
	let cy = $derived((d) => {
		if (!hoverData) return 0;

		const find = d.find((item) => item.data.time === hoverData.time);

		return find ? $yGet(find)[1] : 0;
	});

	let r = $derived((d) => {
		if (!hoverData) return 0;

		const find = d.find((item) => item.data.time === hoverData.time);
		const hasData = Boolean(find && find.data[d.key]);

		return hasData ? 6 : 0;
	});
</script>

{#if hoverData}
	{#each $data as d}
		<circle {cx} cy={cy(d)} r={r(d)} stroke="white" fill={$zGet(d)} />
	{/each}
{/if}
