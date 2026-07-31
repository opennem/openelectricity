<script>
	/**
	 * Regional spot-price chips — render inside a `<MapLibre>` subtree.
	 *
	 * DOM markers (not symbol layers) anchored at each NEM region's
	 * `REGION_ANCHORS` point, tinted by the system-snapshot price scale so the
	 * map and homepage read the same. DOM chips stay legible on all three
	 * basemap themes without any theme wiring. Non-interactive; regions
	 * without a live price render nothing.
	 */
	import { Marker } from 'svelte-maplibre-gl';
	import { REGION_ANCHORS } from '$lib/flows/region-geo.js';
	import { priceColour } from '$lib/price-scale.js';
	import { contrastText, displayCode, formatPrice, numberOrUndefined } from '$lib/flows/format.js';

	/**
	 * @type {{
	 *   prices?: Record<string, number | null | undefined>,
	 *   highlightRegion?: string | null
	 * }}
	 */
	let { prices = {}, highlightRegion = null } = $props();

	let chips = $derived(
		Object.entries(REGION_ANCHORS).flatMap(([code, lnglat]) => {
			const price = numberOrUndefined(prices[code]);
			if (price === undefined) return [];
			const background = priceColour(price);
			return [
				{
					code,
					lnglat,
					background,
					colour: contrastText(background),
					label: `${displayCode(code)} ${formatPrice(price)}`,
					dimmed: highlightRegion !== null && code !== highlightRegion
				}
			];
		})
	);
</script>

{#each chips as chip (chip.code)}
	<Marker lnglat={chip.lnglat}>
		{#snippet content()}
			<!-- One size down from the flow layer's MW boxes — flows are the map's
			     thesis, prices are context. pb one step under pt: the all-caps +
			     digits label has no descenders, so the font's descender space reads
			     as extra bottom padding unless trimmed. -->
			<div
				class="pointer-events-none select-none rounded-lg border border-black/10 px-2 pt-1.5 pb-1 font-mono text-xs font-semibold leading-4 tabular-nums shadow-sm transition-opacity duration-300 {chip.dimmed
					? 'opacity-40'
					: 'opacity-100'}"
				style="background-color: {chip.background}; color: {chip.colour};"
			>
				{chip.label}<span class="text-[9px] font-normal opacity-70">/MWh</span>
			</div>
		{/snippet}
	</Marker>
{/each}
