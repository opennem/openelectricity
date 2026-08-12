<script>
	/**
	 * RegionChartMarkers — the map view's on-anchor chart cards. Renders inside
	 * the `<MapLibre>` subtree.
	 *
	 * One DOM Marker per region: a neutral white card headed by the region
	 * code + live price, with the mini chart beneath. WEM's header carries the
	 * code only — /api/prices is NEM-only. Non-interactive like the price
	 * chips, so map gestures pass straight through the cards.
	 *
	 * NSW, VIC and TAS cards sit offshore — at their anchors they cover the
	 * interconnector flow labels (eastern borders and Basslink) — with a
	 * dotted leader line back to the region point they describe.
	 */

	import { LoaderCircle } from '@lucide/svelte';
	import { CircleLayer, GeoJSONSource, LineLayer, Marker } from 'svelte-maplibre-gl';
	import { REGION_ANCHORS, WEM_ANCHOR } from '$lib/flows/region-geo.js';
	import { displayCode, formatPrice, numberOrUndefined } from '$lib/flows/format.js';
	import { MAP_CHIP_CLASS } from '$lib/components/map/map-style.js';
	import { CARD_ANCHORS, CARD_SIDES } from './card-geometry.js';
	import RegionMiniChart from './RegionMiniChart.svelte';

	/** Junction-dot placement per side-anchored edge (bottom-anchored cards
	 *  point at their region dot instead). @type {Record<string, string>} */
	const JUNCTION_CLASS = {
		left: 'left-0 top-1/2 -translate-x-1/2 -translate-y-1/2',
		right: 'right-0 top-1/2 translate-x-1/2 -translate-y-1/2',
		top: 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2'
	};

	/**
	 * @type {{
	 *   charts?: Record<string, ReturnType<typeof import('./map-minis.js').miniSeriesForRegion>>,
	 *   prices?: Record<string, number | null | undefined>,
	 *   metric?: 'power' | 'price' | 'emissions',
	 *   loading?: boolean,
	 *   highlightRegion?: string | null
	 * }}
	 */
	let {
		charts = {},
		prices = {},
		metric = 'power',
		loading = false,
		highlightRegion = null
	} = $props();

	/** Every card's (code, region point) — the NEM anchors plus WEM.
	 *  @type {Array<[string, [number, number]]>} */
	const CARD_POINTS = [...Object.entries(REGION_ANCHORS), ['WEM', WEM_ANCHOR]];

	let markers = $derived(
		CARD_POINTS.map(([code, lnglat]) => ({
			code,
			lnglat: CARD_ANCHORS[code] ?? lnglat,
			side: CARD_SIDES[code] ?? /** @type {const} */ ('bottom'),
			processed: charts[code] ?? null,
			price: code === 'WEM' ? undefined : numberOrUndefined(prices[code]),
			dimmed: highlightRegion !== null && code !== highlightRegion
		}))
	);

	// Dotted leaders from each offshore card's anchor back to its region point.
	// Built from module constants — plain consts, nothing reactive.
	const leadersGeoJSON = /** @type {GeoJSON.FeatureCollection} */ ({
		type: 'FeatureCollection',
		features: Object.entries(CARD_ANCHORS).map(([code, cardLnglat]) => ({
			type: 'Feature',
			properties: { code },
			geometry: {
				type: 'LineString',
				coordinates: [cardLnglat, REGION_ANCHORS[code]]
			}
		}))
	});

	// A dot at every region's point — what each card (and leader) points to.
	const pointsGeoJSON = /** @type {GeoJSON.FeatureCollection} */ ({
		type: 'FeatureCollection',
		features: CARD_POINTS.map(([code, lnglat]) => ({
			type: 'Feature',
			properties: { code },
			geometry: { type: 'Point', coordinates: lnglat }
		}))
	});
</script>

<GeoJSONSource id="region-chart-leaders" data={leadersGeoJSON}>
	<LineLayer
		id="region-chart-leaders-line"
		paint={{
			'line-color': '#888888',
			'line-opacity': 0.7,
			'line-width': 1.5,
			'line-dasharray': [1, 2]
		}}
	/>
</GeoJSONSource>

<GeoJSONSource id="region-chart-points" data={pointsGeoJSON}>
	<CircleLayer
		id="region-chart-points-dot"
		paint={{
			'circle-radius': 3.5,
			'circle-color': '#353535',
			'circle-stroke-color': '#ffffff',
			'circle-stroke-width': 1.5
		}}
	/>
</GeoJSONSource>

<!-- Cards anchor by their configured mid-edge; the bottom-anchored ones are
     lifted just clear of their region dot, the side-anchored ones touch their
     leader at the edge midpoint, marked with a filled junction dot. -->
{#each markers as marker (marker.code)}
	<Marker
		lnglat={marker.lnglat}
		anchor={marker.side}
		offset={marker.side === 'bottom' ? [0, -8] : [0, 0]}
	>
		{#snippet content()}
			<div
				class="pointer-events-none relative select-none transition-opacity duration-300 {marker.dimmed
					? 'opacity-40'
					: 'opacity-100'}"
			>
				<div class="w-52 overflow-hidden {MAP_CHIP_CLASS}">
					<div
						class="flex items-baseline justify-between gap-2 border-b border-mid-warm-grey/40 bg-light-warm-grey/60 px-2.5 pt-2 pb-1.5 text-sm font-semibold leading-5 text-dark-grey"
					>
						<span class="font-space">{displayCode(marker.code)}</span>
						{#if marker.price !== undefined}
							<span class="font-mono tabular-nums">
								{formatPrice(marker.price)}<span class="text-[10px] font-normal opacity-70"
									>/MWh</span
								>
							</span>
						{/if}
					</div>
					<!-- Held charts belong to the OLD metric while a switch's data is
					     in flight — a spinner (height-matched to the chart) replaces
					     them so the new palette never flashes over stale series. -->
					{#if loading}
						<div class="flex h-[88px] items-center justify-center">
							<LoaderCircle class="size-4 animate-spin text-mid-grey" />
						</div>
					{:else if marker.processed}
						<div class="px-1.5 pt-1 pb-1">
							<RegionMiniChart processed={marker.processed} {metric} />
						</div>
					{/if}
				</div>

				<!-- Filled junction circle where the leader meets the card edge. -->
				{#if JUNCTION_CLASS[marker.side]}
					<span
						class="absolute size-2 rounded-full border border-white bg-[#353535] {JUNCTION_CLASS[
							marker.side
						]}"
					></span>
				{/if}
			</div>
		{/snippet}
	</Marker>
{/each}
