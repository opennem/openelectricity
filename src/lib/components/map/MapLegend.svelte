<script>
	import { getNumberFormat } from '$lib/utils/formatters.js';

	/**
	 * Generic map legend overlay. Renders up to two independent encoding channels:
	 *  - `colour` → one of three layouts mirroring the point colour-encoding mode:
	 *      `single` (swatch + label), `category` (swatch + label per group),
	 *      `range` (gradient bar with min/max values labelled)
	 *  - `size`   → a row of reference markers (one per supplied stop) drawn at
	 *      their actual radii and labelled with the stop's value
	 *
	 * @type {{
	 *   spec: import('./types.js').MapLegendSpec
	 * }}
	 */
	let { spec } = $props();

	const NUMBER_FORMAT = getNumberFormat(2, false);

	/** Cap on the largest size-legend swatch radius (px) so big markers don't
	 * dominate the legend. Swatches scale down proportionally to stay under it. */
	const LEGEND_MAX_RADIUS = 10;

	/** Default formatter — overridden per-spec via `formatValue` (e.g. the chart's value format).
	 * @param {number} n */
	function defaultFormat(n) {
		return Number.isFinite(n) ? NUMBER_FORMAT.format(n) : '';
	}

	const colour = $derived(spec.colour);
	const size = $derived(spec.size ?? null);
</script>

{#snippet swatch(/** @type {string} */ colour)}
	<span class="inline-block size-3 shrink-0 rounded-full" style="background-color: {colour};"
	></span>
{/snippet}

{#snippet channelLabel(/** @type {string} */ text)}
	<span class="mb-1 block text-[9px] uppercase tracking-wide text-mid-grey">{text}</span>
{/snippet}

<div
	class="map-legend pointer-events-none absolute bottom-2 left-2 z-10 max-w-[220px] rounded-md bg-white/90 px-2.5 py-2 text-[11px] text-dark-grey shadow-md backdrop-blur-sm"
>
	{#if colour.mode === 'single'}
		<div class="flex items-center gap-1.5">
			{@render swatch(colour.colour)}
			{#if colour.label}
				<span class="truncate">{colour.label}</span>
			{/if}
		</div>
	{:else if colour.mode === 'category'}
		{#if colour.label}
			{@render channelLabel(colour.label)}
		{/if}
		<div
			class="pointer-events-auto flex max-h-40 flex-col gap-1 overflow-y-auto overscroll-contain pr-1"
		>
			{#each colour.items as item (item.label)}
				<div class="flex items-center gap-1.5">
					{@render swatch(item.colour)}
					<span class="truncate">{item.label}</span>
				</div>
			{/each}
		</div>
	{:else if colour.mode === 'range'}
		{@const format = colour.formatValue ?? defaultFormat}
		{#if colour.label}
			{@render channelLabel(colour.label)}
		{/if}
		<div
			class="h-2.5 w-full rounded-full"
			style="background: linear-gradient(to right, {colour.minColour}, {colour.maxColour});"
		></div>
		<div class="mt-1 flex justify-between text-[10px] tabular-nums text-mid-grey">
			<span>{format(colour.min)}</span>
			<span>{format(colour.max)}</span>
		</div>
	{/if}

	{#if size}
		{@const sizeFormat = size.formatValue ?? defaultFormat}
		<!-- Scale the swatches down to keep the legend compact while preserving the
		     radius ratio between stops. The largest swatch never exceeds LEGEND_MAX_RADIUS. -->
		{@const maxRadius = Math.max(...size.stops.map((s) => s.radius))}
		{@const legendScale = Math.min(1, LEGEND_MAX_RADIUS / maxRadius)}
		<div class="mt-2 border-t border-mid-grey/20 pt-2">
			{#if size.label}
				{@render channelLabel(size.label)}
			{/if}
			<div class="flex items-end gap-3">
				{#each size.stops as stop (stop.value)}
					{@const diameter = stop.radius * legendScale * 2}
					<div class="flex flex-col items-center gap-0.5">
						<span
							class="rounded-full border border-mid-grey/60 bg-mid-grey/20"
							style="width: {diameter}px; height: {diameter}px;"
						></span>
						<span class="text-[10px] tabular-nums text-mid-grey">{sizeFormat(stop.value)}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
