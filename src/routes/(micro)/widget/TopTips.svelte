<script>
	/** @type {{ chart: import('$lib/components/charts/v2/ChartStore.svelte.js').default, wrapperStyles?: string }} */
	let { chart, wrapperStyles = '' } = $props();

	let useData = $derived(chart.hoverData || chart.focusData);
	let max = $derived(useData ? useData._max || 0 : 0);
	let convertedMax = $derived(max || max === 0 ? chart.convertAndFormatValue(max) : '');
	let cxtValueKey = $derived(chart.chartTooltips.valueKey || chart.hoverKey);
	let cxtValueColour = $derived(
		chart.chartTooltips.valueColour || (cxtValueKey ? chart.seriesColours[cxtValueKey] : undefined)
	);
	let valueKey = $derived(useData && cxtValueKey ? useData[cxtValueKey] || undefined : undefined);
	let convertedValue = $derived(
		typeof valueKey === 'number' ? chart.convertAndFormatValue(valueKey) : ''
	);
	let hoverKeyColour = $derived(cxtValueKey ? cxtValueColour : '');
	let hoverKeyLabel = $derived(cxtValueKey ? chart.seriesLabels[cxtValueKey] : '');

	let renewables = [
		'wind.power.grouped',
		'solar_utility.power.grouped',
		'solar_rooftop.power.grouped',
		'hydro.power.grouped',
		'bioenergy_biomass.power.grouped',
		'bioenergy_biogas.power.grouped'
	];

	let seriesData = $derived(chart.seriesData);
	let seriesDataWithRenewables = $derived(
		seriesData.map((d) => {
			let renewablesTotal = 0;

			renewables.forEach((r) => {
				renewablesTotal += /** @type {number} */ (d[r]) || 0;
			});

			return {
				...d,
				renewablesTotal,
				renewablesTotalPercentage: Math.round((renewablesTotal / (d._max || 0)) * 100)
			};
		})
	);
	let averageValue = $derived(
		seriesData.reduce((acc, curr) => acc + (curr._max || 0), 0) / seriesData.length
	);

	let averageRenewablesValue = $derived(
		seriesDataWithRenewables.reduce((acc, curr) => acc + curr.renewablesTotalPercentage, 0) /
			seriesDataWithRenewables.length
	);

	let convertedAverageValue = $derived(
		averageValue || averageValue === 0 ? chart.convertAndFormatValue(averageValue) : ''
	);

	let convertedAverageRenewablesValue = $derived(
		averageRenewablesValue || averageRenewablesValue === 0
			? chart.convertAndFormatValue(averageRenewablesValue)
			: ''
	);
</script>

<div
	class="h-[25px] text-xxs py-1 px-2 rounded-sm border-warm-grey text-mid-grey {wrapperStyles}"
	class:border={useData}
	class:bg-white={useData}
>
	{#if useData}
		<div class="h-full items-center flex justify-between leading-xs whitespace-nowrap">
			{#if valueKey || chart.chartTooltips.showTotal}
				<div class="flex items-center gap-2">
					{#if valueKey}
						<div class="flex items-center gap-2">
							<span class="w-4 h-4 block" style="background-color: {hoverKeyColour}"></span>
							{hoverKeyLabel}
						</div>

						<strong class="font-semibold">{convertedValue} {chart.chartOptions.displayUnit}</strong>
					{/if}
				</div>

				{#if chart.chartTooltips.showTotal}
					<span class="flex items-center gap-2">
						Total
						<strong class="font-semibold">{convertedMax} {chart.chartOptions.displayUnit}</strong>
					</span>
				{/if}
			{/if}
		</div>
	{:else}
		<div class="h-full flex justify-between items-center text-right py-1">
			<div class=" text-mid-warm-grey">MW</div>
			<div class="flex gap-2">
				<div>
					<span class="font-light">av.</span>
					<span class="font-semibold text-dark-grey">{convertedAverageValue} MW</span>
				</div>
				<div>
					<span class="font-light">renewables:</span>
					<span class="font-semibold text-dark-grey">
						{convertedAverageRenewablesValue}%
					</span>
				</div>
			</div>
		</div>
	{/if}
</div>
