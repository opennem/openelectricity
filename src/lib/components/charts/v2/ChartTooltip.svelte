<script>
	/**
	 * Chart Tooltip Component (strip variant)
	 *
	 * Renders a fixed 21px strip above the chart showing the active row's
	 * date, the single hovered series value, and an optional total. Shares
	 * derivation logic with `ChartTooltipFloating.svelte` via
	 * `tooltip-derivations.js`.
	 */

	import {
		getActiveData,
		getValueKey,
		getTotalForRow,
		formatTooltipDate
	} from './tooltip-derivations.js';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart - The chart store instance
	 * @property {string} [defaultText] - Text to show when nothing is hovered
	 * @property {string} [class] - Additional CSS classes
	 */

	/** @type {Props} */
	let { chart, defaultText = '', class: className = '' } = $props();

	let activeData = $derived(getActiveData(chart));
	let valueKey = $derived(getValueKey(chart));
	let value = $derived(activeData && valueKey !== undefined ? activeData[valueKey] : undefined);

	let total = $derived(getTotalForRow(chart, activeData));
	let formattedValue = $derived(
		value !== undefined ? chart.convertAndFormatValue(Number(value)) : ''
	);
	let formattedTotal = $derived(chart.convertAndFormatValue(total));
	let activeColour = $derived(valueKey ? chart.seriesColours[valueKey] : undefined);
	let activeLabel = $derived(valueKey ? chart.seriesLabels[valueKey] : undefined);
	let formattedDate = $derived(formatTooltipDate(chart, activeData));
</script>

<div class="h-[21px] {className}">
	{#if activeData}
		<div class="h-full flex items-center justify-end text-xs">
			<!-- Date -->
			<span class="px-3 py-1 font-light bg-white/40">
				{formattedDate}
			</span>

			{#if value !== undefined || chart.chartTooltips.showTotal}
				<div class="bg-light-warm-grey px-4 py-1 flex gap-4 items-center">
					<!-- Selected series value -->
					{#if value !== undefined && valueKey}
						<div class="flex items-center gap-2">
							<span class="w-2.5 h-2.5 rounded-sm" style="background-color: {activeColour}"></span>
							<span class="text-mid-grey">{activeLabel}</span>
							<strong class="font-semibold">
								{formattedValue}
								{chart.chartOptions.displayUnit}
							</strong>
						</div>
					{/if}

					<!-- Total -->
					{#if chart.chartTooltips.showTotal}
						<span class="flex items-center gap-2">
							<span class="text-mid-grey">Total</span>
							<strong class="font-semibold">
								{formattedTotal}
								{chart.chartOptions.displayUnit}
							</strong>
						</span>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<div class="h-full flex items-center justify-end text-xs text-mid-grey">
			{defaultText}
		</div>
	{/if}
</div>
