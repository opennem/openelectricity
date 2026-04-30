<script>
	/**
	 * Chart Tooltip — compact strip variant.
	 *
	 * Single-line strip rendered above the chart in the same 21 px slot as
	 * `ChartTooltip` (strip), but with a more condensed layout:
	 *
	 *     FY20 — 1.7 g
	 *
	 * The active row's formatted date, an em-dash, then the active series'
	 * value with its display unit. No colour swatch, no series label, no
	 * total — useful for small-multiple grids where horizontal space is
	 * scarce and the series identity is already conveyed by the card title.
	 *
	 * Honours `chart.formatTickX` for the date label (so consumer-provided
	 * formatters like FY-year flow through) and `chart.useFormatY`/`formatY`
	 * for the value (matching how the y-axis ticks render).
	 */

	import {
		getActiveData,
		getValueKey,
		getFormattedX,
		getFormattedY
	} from './tooltip-derivations.js';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart
	 * @property {string} [defaultText]
	 * @property {string} [class]
	 */

	/** @type {Props} */
	let { chart, defaultText = '', class: className = '' } = $props();

	let activeData = $derived(getActiveData(chart));
	let valueKey = $derived(getValueKey(chart));
	let value = $derived(activeData && valueKey !== undefined ? activeData[valueKey] : undefined);

	let formattedValue = $derived(getFormattedY(chart, value));
	let formattedDate = $derived(getFormattedX(chart, activeData));

	let displayUnit = $derived(chart.chartOptions?.displayUnit ?? '');
</script>

<div class="h-[21px] {className}">
	{#if activeData && value !== undefined}
		<div class="h-full flex items-center justify-between text-xs px-3 py-1">
			<span class="text-mid-grey">{formattedDate}</span>
			<strong class="font-semibold text-dark-grey">
				{formattedValue}{displayUnit ? ` ${displayUnit}` : ''}
			</strong>
		</div>
	{:else}
		<div class="h-full flex items-center justify-end text-xs text-mid-grey px-3 py-1">
			{defaultText}
		</div>
	{/if}
</div>
