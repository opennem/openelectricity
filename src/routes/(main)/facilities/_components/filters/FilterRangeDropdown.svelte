<script>
	import RangeSlider from '$lib/components/ui/range-slider/RangeSlider.svelte';
	import FilterPanel from './FilterPanel.svelte';

	/**
	 * Pill trigger + dropdown panel wrapping a two-thumb range slider
	 * (Capacity, Years). When filtered, the pill shows the formatted range.
	 * @type {{
	 *   label: string,
	 *   min: number,
	 *   max: number,
	 *   value: [number, number],
	 *   step?: number,
	 *   formatValue?: (v: number) => string,
	 *   compact?: boolean,
	 *   suppressScrollClose?: boolean,
	 *   onchange?: (range: [number, number]) => void,
	 *   onclear?: () => void
	 * }}
	 */
	let {
		label,
		min,
		max,
		value,
		step = 1,
		formatValue = (v) => String(v),
		compact = false,
		suppressScrollClose = false,
		onchange,
		onclear
	} = $props();

	let isFiltered = $derived(value[0] > min || value[1] < max);
	let pillLabel = $derived(
		isFiltered ? `${formatValue(value[0])} – ${formatValue(value[1])}` : label
	);
</script>

<FilterPanel label={pillLabel} active={isFiltered} {compact} {suppressScrollClose}>
	{#snippet footerLeft()}
		<button
			type="button"
			class="text-xs text-mid-grey hover:text-dark-grey underline underline-offset-2 transition-colors cursor-pointer"
			onclick={() => onclear?.()}
		>
			Clear
		</button>
	{/snippet}

	<div class="p-4">
		<RangeSlider {min} {max} {value} {step} {onchange} {formatValue} />
	</div>
</FilterPanel>
