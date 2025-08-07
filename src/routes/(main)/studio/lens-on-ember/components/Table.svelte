<script>
	import darken from '$lib/utils/colour-darken';
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	import { groupOptions } from '../page-data-options/groups';
	import { getFiltersContext } from '../states/filters.svelte';

	let { chartCxts } = $props();

	let energyCxt = chartCxts['energy-chart'];
	let emissionsCxt = chartCxts['emissions-chart'];
	let filtersCxt = getFiltersContext();

	let combinedSeriesNames = $derived([
		...[...energyCxt.seriesNames].reverse(),
		...[...emissionsCxt.seriesNames].reverse()
	]);
	let uniqueSeriesWithoutType = $derived([
		...new Set(
			combinedSeriesNames.map((id) => {
				// only want the first part of the id
				const parts = id.split('.');
				return parts[0];
			})
		)
	]);

	/**
	 * @param {string} name
	 */
	function onrowclick(name) {
		energyCxt.updateHiddenSeriesNames(`${name}.energy.grouped`, isMetaPressed);
		emissionsCxt.updateHiddenSeriesNames(`${name}.emissions.grouped`, isMetaPressed);
	}

	let touchDelay = 500;
	/** @type {*} */
	let touchTimer = null;

	/**
	 * @param {string} name
	 */
	function ontouchstart(name) {
		touchTimer = setTimeout(() => {
			energyCxt.updateHiddenSeriesNames(`${name}.energy.grouped`, true);
			emissionsCxt.updateHiddenSeriesNames(`${name}.emissions.grouped`, true);
		}, touchDelay);
	}

	function ontouchend() {
		clearTimeout(touchTimer);
	}

	/**
	 * @param {string} energyHoverKey
	 * @param {string} emissionsHoverKey
	 */
	function onmouseenter(energyHoverKey, emissionsHoverKey) {
		energyCxt.hoverKey = energyHoverKey;
		emissionsCxt.hoverKey = emissionsHoverKey;
	}
	function onmouseleave() {
		energyCxt.hoverKey = undefined;
		emissionsCxt.hoverKey = undefined;
	}

	let isMetaPressed = false;
	function onkeyup() {
		isMetaPressed = false;
	}
	/**
	 * @param {KeyboardEvent} evt
	 */
	function onkeydown(evt) {
		if (evt.metaKey || evt.altKey) {
			isMetaPressed = true;
		} else {
			isMetaPressed = false;
		}
	}
</script>

<svelte:window {onkeyup} {onkeydown} />

<div class="sticky top-4 flex flex-col gap-2">
	<table class="w-full table-fixed">
		<thead class="main-thead bg-light-warm-grey border-b border-warm-grey">
			<tr>
				<th class="w-[45%] px-2 py-6 text-sm font-medium text-left">
					<div class="flex items-center gap-4">
						<div
							class="border border-mid-warm-grey text-xs inline-block rounded-md whitespace-nowrap ml-3"
						>
							<FormSelect
								paddingY="py-2"
								paddingX="px-4"
								selectedLabelClass="font-medium text-xs"
								options={groupOptions}
								selected={filtersCxt.selectedFuelTechGroup}
								on:change={(evt) => (filtersCxt.selectedFuelTechGroup = evt.detail.value)}
							/>
						</div>
					</div>
				</th>

				<th class="px-2 py-6 text-sm font-medium">
					<div class="flex flex-col items-end">
						<span class="block text-xs">Contribution</span>
						<span class="font-light text-xxs">%</span>
					</div>
				</th>

				<th class="px-2 py-6 text-sm font-medium">
					<div class="flex flex-col items-end">
						<span class="block text-xs">Generation</span>
						<button
							class="font-light text-xxs hover:underline"
							onclick={() => (energyCxt.chartOptions.displayPrefix = energyCxt.getNextPrefix())}
						>
							{energyCxt.chartOptions.displayUnit}
						</button>
					</div>
				</th>

				<th class="px-2 py-6 text-sm font-medium">
					<div class="flex flex-col items-end mr-3">
						<span class="block text-xs">Emissions</span>
						<button
							class="font-light text-xxs hover:underline"
							onclick={() =>
								(emissionsCxt.chartOptions.displayPrefix = emissionsCxt.getNextPrefix())}
						>
							{emissionsCxt.chartOptions.displayUnit}
						</button>
					</div>
				</th>
			</tr>
		</thead>

		<tbody>
			{#each uniqueSeriesWithoutType as name}
				{@const isImports = name.includes('import')}
				{@const energyName = `${name}.energy.grouped`}
				{@const emissionsName = `${name}.emissions.grouped`}

				{@const energyValue = energyCxt.hoverData
					? energyCxt.hoverData[energyName]
					: energyCxt.focusData
						? energyCxt.focusData[energyName]
						: ''}

				{@const energyPercent = energyCxt.hoverProportionData
					? energyCxt.hoverProportionData[energyName]
					: energyCxt.focusProportionData
						? energyCxt.focusProportionData[energyName]
						: ''}

				{@const emissionsValue = emissionsCxt.hoverData
					? emissionsCxt.hoverData[emissionsName]
					: emissionsCxt.focusData
						? emissionsCxt.focusData[emissionsName]
						: ''}

				<tr
					onclick={() => onrowclick(name)}
					ontouchstart={() => ontouchstart(name)}
					{ontouchend}
					onmouseenter={() => onmouseenter(energyName, emissionsName)}
					{onmouseleave}
					class="hover:bg-light-warm-grey group cursor-pointer text-sm relative top-2"
					class:opacity-50={energyCxt.hiddenSeriesNames.includes(energyName)}
				>
					<td class="px-2 py-1">
						<div class="flex items-center gap-3 ml-3">
							{#if energyCxt.hiddenSeriesNames.includes(energyName)}
								<div
									class="w-6 h-6 min-w-6 min-h-6 border rounded-sm bg-transparent border-mid-warm-grey group-hover:border-mid-grey"
								></div>
							{:else}
								<div
									class="w-6 h-6 min-w-6 min-h-6 border rounded-sm"
									style:background-color={energyCxt.seriesColours[energyName]}
									style:border-color={darken(energyCxt.seriesColours[energyName])}
								></div>
							{/if}

							<div>
								{#if energyCxt.seriesLabels[energyName]}
									{isImports && energyValue < 0 ? 'Export' : energyCxt.seriesLabels[energyName]}
								{:else}
									{energyName}
								{/if}
							</div>
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono text-xs flex items-center justify-end gap-1">
							<span>
								{energyCxt.formatValue(energyPercent)}
							</span>
							<small>%</small>
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end">
							{energyCxt.convertAndFormatValue(energyValue)}
						</div>
					</td>

					<td class="px-2 py-1">
						<div class="font-mono flex flex-col items-end mr-3">
							{emissionsCxt.convertAndFormatValue(emissionsValue)}
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
