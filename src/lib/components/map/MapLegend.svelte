<script>
	import { getNumberFormat } from '$lib/utils/formatters.js';

	/**
	 * Generic map legend overlay. Renders one of three layouts depending on the
	 * colour-encoding mode of the points:
	 *  - `single`   → one swatch + label
	 *  - `category` → a swatch + label per group
	 *  - `range`    → a gradient bar with the min and max values labelled
	 *
	 * @type {{
	 *   spec: import('./types.js').MapLegendSpec
	 * }}
	 */
	let { spec } = $props();

	const NUMBER_FORMAT = getNumberFormat(2, false);

	/** Default formatter — overridden per-spec via `formatValue` (e.g. the chart's value format).
	 * @param {number} n */
	function defaultFormat(n) {
		return Number.isFinite(n) ? NUMBER_FORMAT.format(n) : '';
	}
</script>

{#snippet swatch(/** @type {string} */ colour)}
	<span class="inline-block size-3 shrink-0 rounded-full" style="background-color: {colour};"
	></span>
{/snippet}

<div
	class="map-legend pointer-events-none absolute bottom-2 left-2 z-10 max-w-[220px] rounded-md bg-white/90 px-2.5 py-2 text-[11px] text-dark-grey shadow-md backdrop-blur-sm"
>
	{#if spec.mode === 'single'}
		<div class="flex items-center gap-1.5">
			{@render swatch(spec.colour)}
			{#if spec.label}
				<span class="truncate">{spec.label}</span>
			{/if}
		</div>
	{:else if spec.mode === 'category'}
		{#if spec.label}
			<span class="mb-1 block text-[9px] uppercase tracking-wide text-mid-grey">{spec.label}</span>
		{/if}
		<div
			class="pointer-events-auto flex max-h-40 flex-col gap-1 overflow-y-auto overscroll-contain pr-1"
		>
			{#each spec.items as item (item.label)}
				<div class="flex items-center gap-1.5">
					{@render swatch(item.colour)}
					<span class="truncate">{item.label}</span>
				</div>
			{/each}
		</div>
	{:else if spec.mode === 'range'}
		{@const format = spec.formatValue ?? defaultFormat}
		{#if spec.label}
			<span class="mb-1 block text-[9px] uppercase tracking-wide text-mid-grey">{spec.label}</span>
		{/if}
		<div
			class="h-2.5 w-full rounded-full"
			style="background: linear-gradient(to right, {spec.minColour}, {spec.maxColour});"
		></div>
		<div class="mt-1 flex justify-between text-[10px] tabular-nums text-mid-grey">
			<span>{format(spec.min)}</span>
			<span>{format(spec.max)}</span>
		</div>
	{/if}
</div>
