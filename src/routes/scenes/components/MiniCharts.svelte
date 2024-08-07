<script>
	import LineChart from '$lib/components/charts/LineChart.svelte';
	// import Icon from '$lib/components/Icon.svelte';

	import { formatValue } from '$lib/utils/formatters.js';

	export let seriesNames;
	export let seriesLabels;
	export let seriesColours;
	export let xTicks;
	export let formatTickX;
	export let formatTickY;
	export let chartOverlay;
	export let chartOverlayLine;
	export let chartOverlayHatchStroke;
	export let hoverData;

	/** @type {TimeSeriesData[]} */
	export let seriesData;

	$: keys = [...seriesNames].reverse();
	/**
	 * @param {string} key
	 * @returns {number}
	 */
	function getMaxValue(key) {
		const values = /** @type {number[]} */ (seriesData.map((d) => d[key] || 0));
		const maxValue = Math.round(Math.max(...values));
		return maxValue < 10 ? 10 : maxValue;
	}
</script>

<div class="grid grid-cols-3 border-mid-warm-grey">
	{#each keys as key}
		{@const title = seriesLabels[key]}
		{@const hoverValue = hoverData ? hoverData[key] || 0 : 0}
		{@const maxValue = getMaxValue(key)}
		<section
			class="p-8 border-mid-warm-grey border-b border-l last:border-r [&:nth-child(3n)]:border-r [&:nth-child(-n+3)]:border-t"
		>
			<header>
				<div class="flex justify-between items-center">
					<h6 {title} class="truncate mb-0 col-span-5 text-dark-grey">{title}</h6>
					<!-- {#if fuelTechId}
						<Icon icon={fuelTechId} size={28} />
					{/if} -->
				</div>

				<h3 class="leading-sm h-24 mt-4">
					{#if hoverData}
						{formatValue(hoverValue)}
						<!-- <small class="block text-xs text-mid-grey font-light">{displayUnit}</small> -->
					{/if}
				</h3>
			</header>

			<LineChart
				dataset={seriesData}
				xKey="date"
				yKey={key}
				zKey={seriesColours[key]}
				{xTicks}
				yTicks={[0, maxValue]}
				{formatTickX}
				{formatTickY}
				overlay={chartOverlay}
				overlayLine={chartOverlayLine}
				overlayStroke={chartOverlayHatchStroke}
				{hoverData}
				chartHeightClasses="h-[150px]"
				on:mousemove
				on:mouseout
			/>
		</section>
	{/each}
</div>
