<script>
	import { MapLibre, Marker } from 'svelte-maplibre-gl';
	import OsmFootprintLayer from '$lib/components/map/OsmFootprintLayer.svelte';
	import { fetchOsmPolygon, featureBounds } from '$lib/utils/osm.js';

	/**
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

	// Stable references — a fresh object/array only when the facility coords
	// change. This lets svelte-maplibre-gl reactively recentre on navigation
	// without re-asserting the point on every re-render (e.g. when the polygon
	// loads), which would otherwise fight the fitBounds camera below.
	let center = $derived({ lng, lat });
	let markerLngLat = $derived(/** @type {[number, number]} */ ([lng, lat]));

	// Resolve the facility footprint from OpenStreetMap once the map is ready and
	// frame the viewport to it. Keyed on the facility's osm id + map readiness:
	// reset the polygon on each change, then fetch. The cancelled flag + map
	// identity check guard against a fetch resolving after the facility changed.
	$effect(() => {
		const id = osmWayId;
		const m = map;
		osmPolygon = null;

		if (!m || !id) return;

		let cancelled = false;
		fetchOsmPolygon(id).then((feature) => {
			if (cancelled || !feature || map !== m) return;
			osmPolygon = feature;
			m.fitBounds(featureBounds(feature), { padding: 24, maxZoom: 16, duration: 400 });
		});

		return () => {
			cancelled = true;
		};
	});
</script>

{#snippet markerContent()}
	<div
		class="size-6 rounded-full border-2 border-white shadow-lg ring-2 ring-black/20"
		style:background-color={color}
	></div>
{/snippet}

<div class="w-full h-full min-h-[120px] rounded-lg overflow-hidden border border-warm-grey">
	<MapLibre
		bind:map
		style="/map-styles/satellite.json"
		class="w-full h-full"
		{center}
		{zoom}
		scrollZoom={false}
		cooperativeGestures={true}
		attributionControl={false}
	>
		<OsmFootprintLayer feature={osmPolygon} {color} />
		<Marker lnglat={markerLngLat} content={markerContent} />
	</MapLibre>
</div>
