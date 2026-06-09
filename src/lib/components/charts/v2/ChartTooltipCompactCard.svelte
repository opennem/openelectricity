<script>
	/**
	 * Chart Tooltip — compact card variant.
	 *
	 * A small glassy card rendered above the chart (same flow slot as the
	 * `strip` / `compact-strip` tooltips) that shows the active fiscal year and
	 * value together, styled like the floating tooltip:
	 *
	 *     ┌─────────────────┐
	 *     │ FY20 — 1.7 g    │
	 *     └─────────────────┘
	 *
	 * Unlike `compact-strip` (a full-width row with the date and value pushed to
	 * opposite edges), this groups them in a single bordered, blurred card.
	 *
	 * Reserves a stable height so the chart below doesn't jump as the card
	 * appears/disappears, and honours `chart.formatTickX` / `formatY` exactly
	 * like the strip variants.
	 *
	 * @property {'left' | 'center' | 'right'} [align] - Horizontal placement of
	 *   the card within the slot.
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
	 * @property {'left' | 'center' | 'right'} [align]
	 * @property {string} [class]
	 */

	/** @type {Props} */
	let { chart, defaultText = '', align = 'left', class: className = '' } = $props();

	let activeData = $derived(getActiveData(chart));
	let valueKey = $derived(getValueKey(chart));
	let value = $derived(activeData && valueKey !== undefined ? activeData[valueKey] : undefined);

	let formattedValue = $derived(getFormattedY(chart, value));
	let formattedDate = $derived(getFormattedX(chart, activeData));

	let displayUnit = $derived(chart.chartOptions?.displayUnit ?? '');

	let justify = $derived(
		align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'
	);
</script>

<div class="flex items-center {justify} min-h-[28px] {className}">
	{#if activeData && value !== undefined}
		<div
			class="inline-flex items-center gap-1.5 bg-white/70 backdrop-blur-md backdrop-saturate-150 rounded-md shadow-sm border border-warm-grey text-xs px-2.5 py-1 whitespace-nowrap"
		>
			{#if formattedDate}
				<span class="text-mid-grey font-light">{formattedDate}</span>
				<span class="text-mid-grey font-light" aria-hidden="true">—</span>
			{/if}
			<strong class="font-semibold text-dark-grey tabular-nums">
				{formattedValue}{displayUnit ? ` ${displayUnit}` : ''}
			</strong>
		</div>
	{:else if defaultText}
		<span class="text-xs text-mid-grey">{defaultText}</span>
	{/if}
</div>
