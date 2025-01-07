<script>
	import { createEventDispatcher } from 'svelte';
	import LineChart from '$lib/components/charts/LineChart.svelte';
	// import Icon from '$lib/components/Icon.svelte';

	import { scenarioLabelMap } from '../page-data-options/models';


	

	


	/**
	 * @typedef {Object} Props
	 * @property {any} seriesNames
	 * @property {any} seriesLabels
	 * @property {any} seriesColours
	 * @property {any} xTicks
	 * @property {any} formatTickX
	 * @property {any} formatTickY
	 * @property {any} chartOverlay
	 * @property {any} chartOverlayLine
	 * @property {any} chartOverlayHatchStroke
	 * @property {any} hoverData
	 * @property {any} focusData
	 * @property {string} [displayUnit]
	 * @property {boolean} [isButton]
	 * @property {string} [selected]
	 * @property {any} [seriesPathways]
	 * @property {TimeSeriesData[]} seriesData
	 * @property {string[]} [seriesLoadsIds]
	 * @property {boolean} [showArea]
	 * @property {string} [gridColClass]
	 * @property {string} [sectionBorderClass]
	 */

	/** @type {Props} */
	let {
		seriesNames,
		seriesLabels,
		seriesColours,
		xTicks,
		formatTickX,
		formatTickY,
		chartOverlay,
		chartOverlayLine,
		chartOverlayHatchStroke,
		hoverData,
		focusData,
		displayUnit = '',
		isButton = false,
		selected = '',
		seriesPathways = null,
		seriesData,
		seriesLoadsIds = [],
		showArea = true,
		gridColClass = 'grid-cols-2 md:grid-cols-3',
		sectionBorderClass = ''
	} = $props();

	const dispatch = createEventDispatcher();





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

	/**
	 * @param {string} key
	 */
	function handleScenarioClick(key) {
		if (isButton) {
			dispatch('scenario-click', { key });
		}
	}
	let tag = $derived(isButton ? 'button' : 'header');
	let keys = $derived([...seriesNames].reverse());
	let dataset = $derived(seriesData.map((d) => {
		const obj = { ...d };
		seriesLoadsIds.forEach((id) => {
			obj[id] = d[id] ? -d[id] : d[id];
		});
		return obj;
	}));
	let getMaxValue = $derived((/** @type {string} */ key) => {
		const values = /** @type {number[]} */ (dataset.map((d) => d[key] || 0));
		const maxValue = Math.round(Math.max(...values));
		return maxValue < 10 ? 10 : maxValue;
	});
</script>

<div class="grid {gridColClass} gap-3">
	{#each keys as key}
		{@const title = scenarioLabelMap[key] || seriesLabels[key]}
		{@const updatedHoverData = getUpdatedData(hoverData, key)}
		{@const updatedFocusData = getUpdatedData(focusData, key)}
		{@const hoverValue = updatedHoverData ? updatedHoverData[key] || '—' : '—'}
		{@const focusValue = updatedFocusData ? updatedFocusData[key] || '—' : '—'}
		{@const yTicks = [0, getMaxValue(key)]}
		<section
			class="p-8 border-warm-grey border"
			class:rounded-xl={isButton}
			class:hover:!border-mid-warm-grey={isButton}
			class:!border-mid-grey={selected === key}
			class:shadow-xl={selected === key}
		>
			<svelte:element
				this={tag}
				class="block w-full text-left"
				role={isButton ? 'button' : 'header'}
				tabindex={isButton ? 0 : undefined}
				aria-label={title}
				onmousedown={() => handleScenarioClick(key)}
			>
				<div class="flex flex-col">
					<h6 {title} class="truncate mb-0 col-span-5 text-dark-grey">{title}</h6>
					{#if seriesPathways && seriesPathways[key]}
						<small class="text-xs text-mid-grey">{seriesPathways[key]}</small>
					{/if}
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
			</svelte:element>

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
				{yTicks}
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
				on:mousedown={() => handleScenarioClick(key)}
			/>
		</section>
	{/each}
</div>
