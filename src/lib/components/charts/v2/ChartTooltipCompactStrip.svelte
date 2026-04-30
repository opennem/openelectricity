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

	import { getActiveData, getValueKey } from './tooltip-derivations.js';

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

	let formattedValue = $derived.by(() => {
		if (value === undefined) return '';
		const n = Number(value);
		return chart.useFormatY ? chart.formatY(n) : chart.convertAndFormatValue(n);
	});

	let formattedDate = $derived.by(() => {
		if (!activeData) return '';
		if (chart.isCategoryChart) {
			const categoryValue = activeData[chart.xKey];
			return categoryValue === undefined ? '' : chart.formatX(categoryValue);
		}
		const dateValue = activeData.date ?? activeData.time;
		if (dateValue == null) return '';
		const asDate = dateValue instanceof Date ? dateValue : new Date(dateValue);
		return chart.formatTickX(asDate, chart.timeZone);
	});

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
