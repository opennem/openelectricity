<script>
	/**
	 * Explorer base map — the MapLibre canvas plus the shared transmission-lines
	 * overlay. Deliberately minimal (the facilities Map owns markers/clustering);
	 * data layers land here as the Explorer grows. Lazy-imported by the page so
	 * maplibre stays out of the initial bundle.
	 */

	import { MapLibre, NavigationControl, AttributionControl } from 'svelte-maplibre-gl';
	import TransmissionLinesLayer from '$lib/components/map/TransmissionLinesLayer.svelte';
	import { collapseMapAttribution } from '$lib/components/map/collapse-attribution.js';
	import { mapStyleForTheme, AUSTRALIA_VIEW } from '$lib/components/map/map-style.js';

	/**
	 * @type {{
	 *   mapTheme?: 'light' | 'dark' | 'satellite',
	 *   showTransmissionLines?: boolean,
	 *   cooperativeGestures?: boolean,
	 *   onload?: () => void
	 * }}
	 */
	let {
		mapTheme = 'light',
		showTransmissionLines = true,
		cooperativeGestures = false,
		onload
	} = $props();

	let mapStyle = $derived(mapStyleForTheme(mapTheme));

	/** @type {any | null} */
	let mapInstance = $state(null);

	function handleMapLoad() {
		mapInstance?.once('idle', () => collapseMapAttribution(mapInstance));
		onload?.();
	}
</script>

<div class="w-full h-full overflow-hidden">
	<MapLibre
		style={mapStyle}
		class="w-full h-full"
		center={AUSTRALIA_VIEW.center}
		zoom={AUSTRALIA_VIEW.zoom}
		maxZoom={18}
		minZoom={3}
		scrollZoom
		{cooperativeGestures}
		touchZoomRotate={true}
		attributionControl={false}
		fadeDuration={0}
		bind:map={mapInstance}
		onload={handleMapLoad}
	>
		<TransmissionLinesLayer {mapTheme} visible={showTransmissionLines} />
		<NavigationControl position="top-right" showCompass={false} />
		<AttributionControl position="bottom-right" compact={true} />
	</MapLibre>
</div>
