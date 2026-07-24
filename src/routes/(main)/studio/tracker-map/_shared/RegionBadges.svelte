<script>
	/**
	 * Per-region DOM marker badges — render inside a `<MapLibre>` subtree.
	 *
	 * One pill per region at its `REGION_ANCHORS` anchor: region code, a price
	 * chip tinted by the system-snapshot price scale, an optional thin demand
	 * gauge (fraction of typical peak), and an amber "spill" dot when
	 * curtailment is material. `compact` collapses to code + price dot.
	 */
	import { Marker } from 'svelte-maplibre-gl';
	import { priceColour } from '$lib/components/info-graphics/system-snapshot/helpers.js';
	import { REGION_ANCHORS, REGION_TYPICAL_PEAK_MW } from './region-geo.js';
	import { contrastText, displayCode, formatPrice, numberOrUndefined } from './format.js';

	/**
	 * @type {{
	 *   prices?: Record<string, number>,
	 *   demand?: Record<string, number>,
	 *   curtailment?: Record<string, number>,
	 *   selectedRegion?: string,
	 *   compact?: boolean,
	 *   opacity?: number,
	 *   onselect?: (regionCode: string) => void,
	 *   regions?: string[]
	 * }}
	 */
	let {
		prices = {},
		demand = undefined,
		curtailment = undefined,
		selectedRegion = undefined,
		compact = false,
		opacity = 1,
		onselect = undefined,
		regions = undefined
	} = $props();

	/** Curtailment above this (MW) earns the spill dot. */
	const SPILL_THRESHOLD_MW = 50;

	let regionList = $derived(
		(regions ?? Object.keys(REGION_ANCHORS)).filter((code) => REGION_ANCHORS[code])
	);
</script>

{#each regionList as code (code)}
	{@const price = numberOrUndefined(prices?.[code])}
	{@const chipBg = price !== undefined ? priceColour(price) : '#C6C6C6'}
	{@const spill = numberOrUndefined(curtailment?.[code])}
	{@const showSpill = spill !== undefined && spill > SPILL_THRESHOLD_MW}
	{@const demandValue = numberOrUndefined(demand?.[code])}
	{@const peak = REGION_TYPICAL_PEAK_MW[code]}
	{@const demandFraction =
		!compact && demandValue !== undefined && peak
			? Math.min(1, Math.max(0, demandValue / peak))
			: undefined}
	{@const selected = code === selectedRegion}
	<Marker lnglat={REGION_ANCHORS[code]} anchor="center">
		{#snippet content()}
			<div
				class="transition-opacity duration-300 {opacity === 0 ? 'pointer-events-none' : ''}"
				style:opacity
			>
				<button
					type="button"
					class="flex border border-mid-warm-grey bg-white/95 shadow-md backdrop-blur-sm transition-shadow hover:shadow-lg {selected
						? 'ring-2 ring-red'
						: ''} {compact
						? 'flex-row items-center gap-1.5 rounded-full px-2 py-1'
						: demandFraction !== undefined
							? 'flex-col rounded-lg px-2.5 py-1.5'
							: 'flex-col rounded-full px-2.5 py-1'}"
					onclick={() => onselect?.(code)}
				>
					{#if compact}
						<span class="text-[10px] leading-none font-semibold tracking-wide text-dark-grey">
							{displayCode(code)}
						</span>
						<span
							class="size-2 shrink-0 rounded-full border border-black/10"
							style:background-color={chipBg}
							title={price !== undefined ? `${formatPrice(price)}/MWh` : 'No price'}
						></span>
					{:else}
						<span class="flex items-center gap-1.5">
							<span class="text-[11px] leading-none font-semibold tracking-wide text-dark-grey">
								{displayCode(code)}
							</span>
							{#if showSpill}
								<span
									class="size-2 shrink-0 rounded-full bg-[#F2A93B]"
									title="Curtailment: {Math.round(spill ?? 0)} MW"
								></span>
							{/if}
							{#if price !== undefined}
								<span
									class="rounded-full px-1.5 py-0.5 font-mono text-[10px] leading-none"
									style:background-color={chipBg}
									style:color={contrastText(chipBg)}
								>
									{formatPrice(price)}/MWh
								</span>
							{/if}
						</span>
						{#if demandFraction !== undefined}
							<span
								class="mt-1 block h-[3px] w-full overflow-hidden rounded-full bg-black/10"
								title="Demand: {Math.round(demandValue ?? 0)} MW"
							>
								<span
									class="block h-full rounded-full bg-dark-grey"
									style:width="{demandFraction * 100}%"
								></span>
							</span>
						{/if}
					{/if}
				</button>
			</div>
		{/snippet}
	</Marker>
{/each}
