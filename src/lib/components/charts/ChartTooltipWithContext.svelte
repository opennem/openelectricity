<script>
	import getContext from '$lib/utils/get-context.js';

	/** @type {{ cxtKey: symbol, defaultText?: string, wrapperStyles?: string }} */
	let { cxtKey, defaultText = '', wrapperStyles = '' } = $props();

	/** @type {import('$lib/components/charts/stores/chart.svelte.js').default} */
	let cxt = getContext(cxtKey);

	let useData = $derived(cxt.hoverData || cxt.focusData);
	let max = $derived(useData ? useData._max || 0 : 0);
	let convertedMax = $derived(max || max === 0 ? cxt.convertAndFormatValue(max) : '');
	let valueDate = $derived(useData ? useData.date || undefined : undefined);
	let cxtValueKey = $derived(cxt.chartTooltips.valueKey || cxt.hoverKey);
	let cxtValueColour = $derived(cxt.chartTooltips.valueColour || cxt.seriesColours[cxtValueKey]);
	let valueKey = $derived(useData && cxtValueKey ? useData[cxtValueKey] || undefined : undefined);
	let convertedValue = $derived(
		valueKey || valueKey === 0 ? cxt.convertAndFormatValue(valueKey) : ''
	);
	let hoverKeyColour = $derived(cxtValueKey ? cxtValueColour : '');
	let hoverKeyLabel = $derived(cxtValueKey ? cxt.seriesLabels[cxtValueKey] : '');
</script>

<div class="h-[21px] {wrapperStyles}">
	{#if useData}
		<div class="h-full items-center flex justify-end text-xs leading-xs whitespace-nowrap">
			<span class="px-3 py-1 font-light bg-white/40">
				{cxt.formatXWithTimeZone(valueDate)}
			</span>

			{#if valueKey || cxt.chartTooltips.showTotal}
				<div class="bg-light-warm-grey px-4 py-1 flex gap-4 items-center">
					{#if valueKey}
						<div class="flex items-center gap-2">
							<div class="flex items-center gap-2">
								<span class="w-2.5 h-2.5 block" style="background-color: {hoverKeyColour}"></span>
								{hoverKeyLabel}
							</div>

							<strong class="font-semibold">{convertedValue} {cxt.chartOptions.displayUnit}</strong>
						</div>
					{/if}

					{#if cxt.chartTooltips.showTotal}
						<span class="flex items-center gap-2">
							Total
							<strong class="font-semibold">{convertedMax} {cxt.chartOptions.displayUnit}</strong>
						</span>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<div class="h-full text-right text-xs text-mid-grey py-1">
			{defaultText}
		</div>
	{/if}
</div>
