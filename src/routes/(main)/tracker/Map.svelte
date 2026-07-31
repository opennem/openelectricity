<script>
	/**
	 * Tracker base map — the MapLibre canvas plus the shared transmission-lines
	 * overlay, interconnector flow arcs and regional price chips. Deliberately
	 * lean (the facilities Map owns markers/clustering); lazy-imported by the
	 * page so maplibre stays out of the initial bundle.
	 *
	 * Flow/price data arrives via props from the page's grid-live poll store.
	 * Everything NEM-flow-related hides when the WEM region is selected — the
	 * corridors are NEM-only.
	 */

	import { MapLibre, NavigationControl, AttributionControl } from 'svelte-maplibre-gl';
	import TransmissionLinesLayer from '$lib/components/map/TransmissionLinesLayer.svelte';
	import { allBandsVisible, transmissionBandFilter } from '$lib/facilities/transmission-bands.js';
	import FlowArcsLayer from '$lib/components/map/FlowArcsLayer.svelte';
	import RegionPriceMarkers from '$lib/components/map/RegionPriceMarkers.svelte';
	import { collapseMapAttribution } from '$lib/components/map/collapse-attribution.js';
	import { mapStyleForTheme } from '$lib/components/map/map-style.js';
	import { coordsBounds } from '$lib/utils/osm.js';
	import { INTERCONNECTORS, getInterconnector, corridorCoords } from '$lib/flows/region-geo.js';

	/**
	 * Default framing — tighter than the shared AUSTRALIA_VIEW (zoom 3.5) and
	 * biased south-east so the NEM (where all the flow/price content lives)
	 * fills the frame; also the "full view" a corridor Back returns to. The
	 * centre sits well south of the landmass midpoint: the content ends at the
	 * QLD chip (~-23.5), so centring higher just banks empty far-north
	 * Queensland while pushing VIC/TAS into the bottom edge.
	 */
	const DEFAULT_VIEW = Object.freeze({ center: { lng: 135.5, lat: -33 }, zoom: 4.1 });

	/**
	 * `panelInsetLeftPx`/`panelInsetBottomPx` shift the corridor-zoom framing
	 * clear of the overlaid detail panel (desktop left slide-in / mobile
	 * bottom sheet).
	 *
	 * @type {{
	 *   mapTheme?: 'light' | 'dark' | 'satellite',
	 *   showTransmissionLines?: boolean,
	 *   transmissionLineVisibility?: import('$lib/facilities/transmission-bands.js').BandVisibility,
	 *   showFlows?: boolean,
	 *   flows?: Record<string, number>,
	 *   prices?: Record<string, number>,
	 *   selectedRegion?: string,
	 *   selectedInterconnector?: string | null,
	 *   panelInsetLeftPx?: number,
	 *   panelInsetBottomPx?: number,
	 *   onselectinterconnector?: (key: string) => void,
	 *   cooperativeGestures?: boolean,
	 *   onload?: () => void
	 * }}
	 */
	let {
		mapTheme = 'light',
		showTransmissionLines = true,
		transmissionLineVisibility = allBandsVisible(),
		showFlows = true,
		flows = {},
		prices = {},
		selectedRegion = '_all',
		selectedInterconnector = null,
		panelInsetLeftPx = 0,
		panelInsetBottomPx = 0,
		onselectinterconnector,
		cooperativeGestures = false,
		onload
	} = $props();

	let mapStyle = $derived(mapStyleForTheme(mapTheme));

	/** @type {any | null} */
	let mapInstance = $state(null);
	let mapReady = $state(false);

	// The NEM flow layers make no sense on a WEM-focused map; `_all` and NEM
	// regions keep them, with the non-adjacent corridors/chips dimmed.
	let isWem = $derived(selectedRegion === 'wem');
	let showFlowLayers = $derived(showFlows && !isWem);
	let highlightRegion = $derived(
		selectedRegion !== '_all' && !isWem ? selectedRegion.toUpperCase() : null
	);

	// Physical interconnector lines (matched by objectid) get a casing while
	// the transmission layer is on; the selected corridor's lines get the
	// stronger treatment.
	let highlightObjectIds = $derived(
		showFlowLayers ? INTERCONNECTORS.flatMap((ic) => ic.objectids) : []
	);
	let selectedObjectIds = $derived(
		showFlowLayers
			? (INTERCONNECTORS.find((ic) => ic.key === selectedInterconnector)?.objectids ?? [])
			: []
	);

	// Band filter shared with /facilities — the map key's swatches drive it. The
	// interconnector casing layer filters by objectid, so a corridor keeps its
	// emphasis even when its own band is switched off.
	let transmissionFilter = $derived(transmissionBandFilter(transmissionLineVisibility));

	function handleMapLoad() {
		mapReady = true;
		onload?.();
	}

	// Collapse the attribution as soon as the map binds — the utility's own
	// observer handles MapLibre mounting it expanded, so there's no need to
	// wait for `idle` (which the overlay layers can delay by seconds).
	$effect(() => {
		if (!mapInstance) return;
		return collapseMapAttribution(mapInstance);
	});

	// ============================================
	// Corridor focus zoom
	// ============================================

	const FOCUS_ZOOM_DURATION = 800;

	// Fly to the selected corridor (padded clear of the overlaid panel); a
	// cleared selection returns to the full national framing. Tracked with a
	// non-reactive last-key so pans/other prop churn never re-trigger the
	// animation, and the initial null selection doesn't fly at all.
	/** @type {string | null | undefined} */
	let lastFocusKey = undefined;
	$effect(() => {
		const map = mapInstance;
		const key = selectedInterconnector;
		if (!map || !mapReady) return;
		if (key === lastFocusKey) return;
		const wasFocused = lastFocusKey !== undefined && lastFocusKey !== null;
		lastFocusKey = key;

		if (key) {
			const ic = getInterconnector(key);
			if (!ic) return;
			// Clamp the panel insets so left+right / top+bottom padding can never
			// exceed the canvas (fitBounds throws when it does).
			const canvas = map.getCanvas();
			const left = Math.min(60 + panelInsetLeftPx, canvas.clientWidth * 0.6);
			const bottom = Math.min(60 + panelInsetBottomPx, canvas.clientHeight * 0.55);
			map.fitBounds(coordsBounds(corridorCoords(ic)), {
				padding: { top: 60, right: 60, bottom, left },
				duration: FOCUS_ZOOM_DURATION,
				maxZoom: 7
			});
		} else if (wasFocused) {
			map.flyTo({
				center: DEFAULT_VIEW.center,
				zoom: DEFAULT_VIEW.zoom,
				duration: FOCUS_ZOOM_DURATION
			});
		}
	});
</script>

<div class="w-full h-full overflow-hidden">
	<MapLibre
		style={mapStyle}
		class="w-full h-full"
		center={DEFAULT_VIEW.center}
		zoom={DEFAULT_VIEW.zoom}
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
		<TransmissionLinesLayer
			{mapTheme}
			visible={showTransmissionLines}
			filter={transmissionFilter}
			{highlightObjectIds}
			{selectedObjectIds}
		/>
		{#if showFlowLayers}
			<FlowArcsLayer
				{flows}
				{mapTheme}
				selectedKey={selectedInterconnector}
				{highlightRegion}
				onarcclick={onselectinterconnector}
			/>
			<RegionPriceMarkers {prices} {highlightRegion} />
		{/if}
		<NavigationControl position="top-right" showCompass={false} />
		<AttributionControl position="bottom-right" compact={true} />
	</MapLibre>
</div>
