<script>
	import getContext from '$lib/utils/get-context.js';

	/** @type {{ cxtKey: symbol, defaultText?: string, wrapperStyles?: string }} */
	let { cxtKey, defaultText = '', wrapperStyles = '' } = $props();

	/** @type {import('$lib/components/charts/stores/chart.svelte.js').default} */
	let cxt = getContext(cxtKey);

	let useData = $derived(cxt.hoverData || cxt.focusData);
	let max = $derived(useData ? useData._max || 0 : 0);
	let convertedMax = $derived(max || max === 0 ? cxt.convertAndFormatValue(max) : '');
	let cxtValueKey = $derived(cxt.chartTooltips.valueKey || cxt.hoverKey);
	let cxtValueColour = $derived(cxt.chartTooltips.valueColour || cxt.seriesColours[cxtValueKey]);
	let valueKey = $derived(useData && cxtValueKey ? useData[cxtValueKey] || undefined : undefined);
	let convertedValue = $derived(
		valueKey || valueKey === 0 ? cxt.convertAndFormatValue(valueKey) : ''
	);
	let hoverKeyColour = $derived(cxtValueKey ? cxtValueColour : '');
	let hoverKeyLabel = $derived(cxtValueKey ? cxt.seriesLabels[cxtValueKey] : '');

	let renewables = [
		'wind.power.grouped',
		'solar_utility.power.grouped',
		'solar_rooftop.power.grouped',
		'hydro.power.grouped',
		'bioenergy_biomass.power.grouped',
		'bioenergy_biogas.power.grouped'
	];

	let seriesData = $derived(cxt.seriesData);
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
		averageValue || averageValue === 0 ? cxt.convertAndFormatValue(averageValue) : ''
	);

	let convertedAverageRenewablesValue = $derived(
		averageRenewablesValue || averageRenewablesValue === 0
			? cxt.convertAndFormatValue(averageRenewablesValue)
			: ''
	);
</script>

<div
	class="h-[25px] text-xxs py-1 px-2 rounded border-warm-grey text-mid-grey {wrapperStyles}"
	class:border={useData}
	class:bg-white={useData}
>
	{#if useData}
		<div class="h-full items-center flex justify-between leading-xs whitespace-nowrap">
			{#if valueKey || cxt.chartTooltips.showTotal}
				<div class="flex items-center gap-2">
					{#if valueKey}
						<div class="flex items-center gap-2">
							<span class="w-4 h-4 block" style="background-color: {hoverKeyColour}"></span>
							{hoverKeyLabel}
						</div>

						<strong class="font-semibold">{convertedValue} {cxt.chartOptions.displayUnit}</strong>
					{/if}
				</div>

				{#if cxt.chartTooltips.showTotal}
					<span class="flex items-center gap-2">
						Total
						<strong class="font-semibold">{convertedMax} {cxt.chartOptions.displayUnit}</strong>
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
