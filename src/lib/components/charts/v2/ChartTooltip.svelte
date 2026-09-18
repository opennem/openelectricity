<script>
	/**
	 * Chart Tooltip Component (strip variant)
	 *
	 * Renders a fixed strip above the chart (two lines in narrow cards) showing the active row's
	 * date, the single hovered series value, and an optional total. Shares
	 * derivation logic with `ChartTooltipFloating.svelte` via
	 * `tooltip-derivations.js`.
	 */

	import {
		getActiveData,
		getValueKey,
		getTotalForRow,
		getFormattedX,
		getFormattedY,
		formatTooltipNumericValue
	} from './tooltip-derivations.js';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart - The chart store instance
	 * @property {string} [defaultText] - Text to show when nothing is hovered
	 * @property {string} [class] - Additional CSS classes
	 * @property {string} [contentClass] - Justification (and any extra) classes for the
	 *   content row. Defaults to right-aligned; pass e.g. `justify-start md:justify-end`
	 *   to left-align on mobile.
	 */

	/** @type {Props} */
	let { chart, defaultText = '', class: className = '', contentClass = 'justify-end' } = $props();

	let activeData = $derived(getActiveData(chart));
	let valueKey = $derived(getValueKey(chart));
	let value = $derived(activeData && valueKey !== undefined ? activeData[valueKey] : undefined);

	let total = $derived(getTotalForRow(chart, activeData));
	let formattedValue = $derived(getFormattedY(chart, value));
	let formattedTotal = $derived(formatTooltipNumericValue(chart, total));
	let activeColour = $derived(valueKey ? chart.seriesColours[valueKey] : undefined);
	let activeLabel = $derived(valueKey ? chart.seriesLabels[valueKey] : undefined);
	let formattedDate = $derived(getFormattedX(chart, activeData));
</script>

<div data-testid="chart-tooltip-strip" class="tooltip-container {className}">
	{#if activeData}
		<div class="tooltip-row {contentClass} text-xs">
			<!-- Date -->
			{#if formattedDate}
				<span class="px-3 py-1 font-light bg-white/40">
					{formattedDate}
				</span>
			{/if}

			{#if value !== undefined || chart.chartTooltips.showTotal}
				<div class="tooltip-values bg-light-warm-grey px-2 py-1 flex gap-3 items-center">
					<!-- Selected series value -->
					{#if value !== undefined && valueKey}
						<div class="flex min-w-0 items-center gap-2">
							<span class="w-2.5 h-2.5 rounded-sm" style="background-color: {activeColour}"></span>
							<span class="truncate text-mid-grey">{activeLabel}</span>
							<strong class="shrink-0 font-semibold">
								{formattedValue}
								{chart.tooltipUnit}
							</strong>
						</div>
					{/if}

					<!-- Total -->
					{#if chart.chartTooltips.showTotal}
						<span class="flex min-w-0 items-center gap-2">
							<span class="text-mid-grey">Total</span>
							<strong class="shrink-0 font-semibold">
								{formattedTotal}
								{chart.tooltipUnit}
							</strong>
						</span>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<div class="tooltip-row {contentClass} text-xs text-mid-grey">
			{defaultText}
		</div>
	{/if}
</div>

<style>
	.tooltip-container {
		container-type: inline-size;
	}
	.tooltip-row {
		display: flex;
		align-items: center;
		height: 21px;
		white-space: nowrap;
	}
	.tooltip-values {
		max-width: 100%;
	}
	@container (max-width: 460px) {
		.tooltip-row {
			height: 42px;
			flex-direction: column;
			align-items: flex-end;
			justify-content: center;
		}
	}
</style>
