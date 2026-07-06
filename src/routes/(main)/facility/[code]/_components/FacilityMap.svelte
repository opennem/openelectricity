<script>
	import {
		MapLibre,
		Marker,
		GeoJSONSource,
		LineLayer,
		AttributionControl
	} from 'svelte-maplibre-gl';
	import OsmFootprintLayer from '$lib/components/map/OsmFootprintLayer.svelte';
	import { collapseMapAttribution } from '$lib/components/map/collapse-attribution.js';
	import MapOptionsDropdown from '../../../facilities/_components/MapOptionsDropdown.svelte';
	import { fetchOsmPolygon, featureBounds } from '$lib/utils/osm.js';

	/**
	 * Full-bleed, interactive facility location map. Unlike the sidebar
	 * `FacilityMiniMap` preview, this fills its container edge-to-edge with normal
	 * pan/zoom gestures and a floating layer control (base style + transmission
	 * lines). Used by the mobile Map tab on the facility detail page.
	 *
	 * @type {{
	 *   lat: number,
	 *   lng: number,
	 *   color?: string,
	 *   zoom?: number,
	 *   osmWayId?: string | number | null
	 * }}
	 */
	let { lat, lng, color = '#ffffff', zoom = 14, osmWayId = null } = $props();

	/** @type {any} */
	let map = $state();

	/** @type {GeoJSON.Feature | null} */
	let osmPolygon = $state(null);

	/** @type {'light' | 'dark' | 'satellite'} */
	let mapTheme = $state('satellite');
	let showTransmissionLines = $state(false);

	let mapStyle = $derived(
		mapTheme === 'satellite'
			? '/map-styles/satellite.json'
			: mapTheme === 'dark'
				? '/map-styles/dark-matter.json'
				: '/map-styles/positron.json'
	);
	let satelliteView = $derived(mapTheme === 'satellite');

	// Stable references — a fresh object/array only when the coords change, so
	// svelte-maplibre-gl recentres on navigation without fighting the fitBounds
	// camera below (mirrors FacilityMiniMap).
	let center = $derived({ lng, lat });
	let markerLngLat = $derived(/** @type {[number, number]} */ ([lng, lat]));

	// Resolve the facility footprint from OpenStreetMap once the map is ready and
	// frame the viewport to it. Guarded against a fetch resolving after the
	// facility (and map) changed.
	$effect(() => {
		const id = osmWayId;
		const m = map;
		osmPolygon = null;

		if (!m || !id) return;

		let cancelled = false;
		fetchOsmPolygon(id).then((feature) => {
			if (cancelled || !feature || map !== m) return;
			osmPolygon = feature;
			m.fitBounds(featureBounds(feature), { padding: 40, maxZoom: 16, duration: 400 });
		});

		return () => {
			cancelled = true;
		};
	});

	// Collapse MapLibre's compact attribution to just the ⓘ button by default.
	$effect(() => {
		if (map) return collapseMapAttribution(map);
	});
</script>

{#snippet markerContent()}
	<div
		class="size-6 rounded-full border-2 border-white shadow-lg ring-2 ring-black/20"
		style:background-color={color}
	></div>
{/snippet}

<div class="relative h-full w-full">
	<MapLibre
		bind:map
		style={mapStyle}
		class="h-full w-full"
		{center}
		{zoom}
		attributionControl={false}
	>
		{#if showTransmissionLines}
			<!-- Mounted on demand — the source geojson is large, so it only loads
			     once the layer is switched on. -->
			<GeoJSONSource id="transmission-lines" data="/data/transmission-lines.geojson">
				<LineLayer
					id="transmission-lines-layer"
					paint={{
						'line-color': [
							'case',
							['>=', ['get', 'capacitykv'], 400],
							satelliteView ? '#ff6b6b' : '#c0392b',
							['>=', ['get', 'capacitykv'], 220],
							satelliteView ? '#ffd93d' : '#c49b00',
							['>=', ['get', 'capacitykv'], 110],
							satelliteView ? '#6bcb77' : '#27ae60',
							satelliteView ? '#74b9ff' : '#2980b9'
						],
						'line-width': ['interpolate', ['linear'], ['zoom'], 10, 1.5, 16, 4],
						'line-opacity': 0.85
					}}
					layout={{ 'line-cap': 'round', 'line-join': 'round' }}
				/>
			</GeoJSONSource>
		{/if}
		<OsmFootprintLayer feature={osmPolygon} {color} />
		<Marker lnglat={markerLngLat} content={markerContent} />
		<AttributionControl position="bottom-right" compact={true} />
	</MapLibre>

	<!-- Floating layer control — base style + transmission lines. -->
	<div class="absolute right-3 top-3 z-10">
		<MapOptionsDropdown
			{mapTheme}
			{showTransmissionLines}
			showGolfOption={false}
			showClusteringOption={false}
			iconOnly={true}
			onmapthemechange={(v) => (mapTheme = v)}
			ontransmissionlineschange={(v) => (showTransmissionLines = v)}
		/>
	</div>
</div>
