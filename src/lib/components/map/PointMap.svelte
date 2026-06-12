<script>
	import {
		MapLibre,
		Popup,
		NavigationControl,
		AttributionControl,
		GeoJSONSource,
		CircleLayer
	} from 'svelte-maplibre-gl';
	import MapLegend from './MapLegend.svelte';
	import { collapseMapAttribution } from './collapse-attribution.js';

	/**
	 * @typedef {import('./types.js').MapPoint} MapPoint
	 * @typedef {import('./types.js').MapLegendSpec} MapLegendSpec
	 */

	/**
	 * @type {{
	 *   points?: MapPoint[],
	 *   mapTheme?: 'light' | 'dark' | 'satellite',
	 *   scrollZoom?: boolean,
	 *   cooperativeGestures?: boolean,
	 *   suppressFitBounds?: boolean,
	 *   popupColumns?: string[],
	 *   popupColumnLabels?: Record<string, string>,
	 *   legend?: MapLegendSpec | null,
	 *   height?: string,
	 *   onclick?: (point: MapPoint | null) => void
	 * }}
	 */
	let {
		points = [],
		mapTheme = 'light',
		scrollZoom = false,
		cooperativeGestures = false,
		suppressFitBounds = false,
		popupColumns = [],
		popupColumnLabels = {},
		legend = null,
		height = '500px',
		onclick
	} = $props();

	const FIT_DURATION = 600;

	/** @type {any} */
	let mapInstance = $state(null);

	/** @type {string | number | null} */
	let openPointId = $state(null);

	let mapStyle = $derived(
		mapTheme === 'satellite'
			? '/map-styles/satellite.json'
			: mapTheme === 'dark'
				? '/map-styles/dark-matter.json'
				: '/map-styles/positron.json'
	);

	let geojson = $derived({
		type: /** @type {'FeatureCollection'} */ ('FeatureCollection'),
		features: points.map((p) => ({
			type: /** @type {'Feature'} */ ('Feature'),
			geometry: {
				type: /** @type {'Point'} */ ('Point'),
				coordinates: [p.lng, p.lat]
			},
			properties: {
				id: p.id,
				colour: p.colour,
				radius: p.radius
			}
		}))
	});

	let openPoint = $derived(points.find((p) => p.id === openPointId) ?? null);

	// Pack the lat/lng extent into a primitive string so $derived dedupes
	// by value — radius/colour edits change `points` identity but leave the
	// extent the same, so the downstream fitBounds $effect stays quiet.
	const boundsKey = $derived.by(() => {
		if (points.length === 0) return '';
		let minLng = Infinity;
		let maxLng = -Infinity;
		let minLat = Infinity;
		let maxLat = -Infinity;
		for (const p of points) {
			if (p.lng < minLng) minLng = p.lng;
			if (p.lng > maxLng) maxLng = p.lng;
			if (p.lat < minLat) minLat = p.lat;
			if (p.lat > maxLat) maxLat = p.lat;
		}
		if (!Number.isFinite(minLng)) return '';
		return `${minLng}|${maxLng}|${minLat}|${maxLat}`;
	});

	$effect(() => {
		if (!mapInstance || suppressFitBounds || !boundsKey) return;
		const [minLng, maxLng, minLat, maxLat] = boundsKey.split('|').map(Number);
		const lngPad = (maxLng - minLng || 0.5) * 0.1;
		const latPad = (maxLat - minLat || 0.5) * 0.1;
		try {
			mapInstance.fitBounds(
				[
					[minLng - lngPad, minLat - latPad],
					[maxLng + lngPad, maxLat + latPad]
				],
				{ padding: 40, maxZoom: 12, duration: FIT_DURATION }
			);
		} catch {
			// no-op
		}
	});

	$effect(() => {
		if (!mapInstance) return;
		return collapseMapAttribution(mapInstance);
	});

	/** @param {any} ev */
	function handlePointClick(ev) {
		const feature = ev?.features?.[0];
		const id = feature?.properties?.id;
		if (id == null) return;
		openPointId = id;
		const match = points.find((p) => p.id === id) ?? null;
		onclick?.(match);
	}

	function handleMapClick() {
		if (openPointId != null) {
			openPointId = null;
			onclick?.(null);
		}
	}

	function handlePointMouseEnter() {
		if (mapInstance) mapInstance.getCanvas().style.cursor = 'pointer';
	}

	function handlePointMouseLeave() {
		if (mapInstance) mapInstance.getCanvas().style.cursor = '';
	}
</script>

<div class="point-map" style="height: {height};">
	<MapLibre
		style={mapStyle}
		class="w-full h-full"
		center={{ lng: 134, lat: -25 }}
		zoom={3}
		maxZoom={18}
		minZoom={1}
		{scrollZoom}
		{cooperativeGestures}
		touchZoomRotate={true}
		attributionControl={false}
		fadeDuration={0}
		bind:map={mapInstance}
		onclick={handleMapClick}
	>
		<NavigationControl position="top-right" showCompass={false} />
		<AttributionControl position="bottom-right" compact={true} />

		<GeoJSONSource id="point-map-points" data={geojson}>
			<CircleLayer
				id="point-map-circles"
				paint={{
					'circle-color': ['get', 'colour'],
					'circle-radius': ['get', 'radius'],
					'circle-stroke-width': 1,
					'circle-stroke-color': '#ffffff',
					'circle-opacity': 0.85
				}}
				onmouseenter={handlePointMouseEnter}
				onmouseleave={handlePointMouseLeave}
				onclick={handlePointClick}
			/>
		</GeoJSONSource>

		{#if openPoint}
			<Popup
				lnglat={[openPoint.lng, openPoint.lat]}
				offset={[0, -openPoint.radius - 4]}
				closeOnClick={false}
				anchor="bottom"
			>
				<div class="bg-black rounded-lg px-4 py-3 shadow-lg text-white min-w-[200px] max-w-[280px]">
					{#if openPoint.label}
						<div class="font-semibold text-sm mb-2">{openPoint.label}</div>
					{/if}
					{#if popupColumns.length > 0}
						<dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
							{#each popupColumns as col (col)}
								{@const value = openPoint.raw[col]}
								{#if value != null && value !== ''}
									<dt class="text-white/60">{popupColumnLabels[col] ?? col}</dt>
									<dd class="text-white">{value}</dd>
								{/if}
							{/each}
						</dl>
					{/if}
				</div>
			</Popup>
		{/if}
	</MapLibre>

	{#if legend}
		<MapLegend spec={legend} />
	{/if}
</div>

<style>
	.point-map {
		width: 100%;
		position: relative;
	}
	.point-map :global(.maplibregl-popup-content) {
		padding: 0;
		background: transparent;
		box-shadow: none;
	}
	.point-map :global(.maplibregl-popup-tip) {
		border-top-color: #000;
	}
</style>
