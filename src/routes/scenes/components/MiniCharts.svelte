<script>
	import LineChart from '$lib/components/charts/LineChart.svelte';
	// import Icon from '$lib/components/Icon.svelte';

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
	export let focusData;
	export let displayUnit = '';

	/** @type {TimeSeriesData[]} */
	export let seriesData;

	/** @type {string[]} */
	export let seriesLoadsIds = [];

	export let showArea = true;

	export let gridColClass = 'grid-cols-2 md:grid-cols-3';

	export let gridBorderLeft = 'border-l';

	$: keys = [...seriesNames].reverse();
	/**
	 * @param {string} key
	 * @returns {number}
	 */
	function getMaxValue(key) {
		const values = /** @type {number[]} */ (dataset.map((d) => d[key] || 0));
		const maxValue = Math.round(Math.max(...values));
		return maxValue < 10 ? 10 : maxValue;
	}

	$: dataset = seriesData.map((d) => {
		const obj = { ...d };
		seriesLoadsIds.forEach((id) => {
			obj[id] = d[id] ? -d[id] : d[id];
		});
		return obj;
	});

	/**
	 * @param {string} key
	 */
	function isLoad(key) {
		return seriesLoadsIds.includes(key);
	}

	/**
	 * @param {TimeSeriesData | undefined} data
	 * @param {string} key
	 */
	function getUpdatedData(data, key) {
		if (!data) return undefined;
		const updatedData = { ...data };
		if (isLoad(key)) {
			updatedData[key] = data[key] ? -data[key] : data[key];
		}
		return updatedData;
	}
</script>

<div class="grid {gridColClass} border-mid-warm-grey">
	{#each keys as key}
		{@const title = seriesLabels[key]}
		{@const updatedHoverData = getUpdatedData(hoverData, key)}
		{@const updatedFocusData = getUpdatedData(focusData, key)}
		{@const hoverValue = updatedHoverData ? updatedHoverData[key] || '—' : '—'}
		{@const focusValue = updatedFocusData ? updatedFocusData[key] || '—' : '—'}
		{@const maxValue = getMaxValue(key)}
		<section
			class="p-8 border-mid-warm-grey border-b {gridBorderLeft} last:border-r [&:nth-child(2n)]:border-r [&:nth-child(-n+2)]:border-t md:[&:nth-child(3n)]:border-r md:[&:nth-child(-n+3)]:border-t"
		>
			<header>
				<div class="flex justify-between items-center">
					<h6 {title} class="truncate mb-0 col-span-5 text-dark-grey">{title}</h6>
					<!-- {#if fuelTechId}
						<Icon icon={fuelTechId} size={28} />
					{/if} -->
				</div>

				<h3 class="leading-sm h-14 mt-4 mb-0">
					{#if hoverData}
						{formatTickY(hoverValue)}
						<small class="block text-xs text-mid-grey font-light">{displayUnit}</small>
					{:else if focusData}
						{formatTickY(focusValue)}
						<small class="block text-xs text-mid-grey font-light">{displayUnit}</small>
					{/if}
				</h3>
			</header>

			<div class="text-right h-8">
				{#if hoverData}
					<span class="text-mid-grey text-xs">
						{formatTickX(hoverData.time)}
					</span>
				{:else if focusData}
					<span class="text-mid-grey text-xs">
						{formatTickX(focusData.time)}
					</span>
				{/if}
			</div>

			<LineChart
				{dataset}
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
				hoverData={updatedHoverData}
				focusData={updatedFocusData}
				{showArea}
				chartHeightClasses="h-[150px]"
				on:mousemove
				on:mouseout
				on:pointerup
			/>
		</section>
	{/each}
</div>
