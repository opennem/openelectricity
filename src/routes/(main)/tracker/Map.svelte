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
	import RegionChartMarkers from './RegionChartMarkers.svelte';
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
	 *   showRegionCharts?: boolean,
	 *   regionCharts?: Record<string, ReturnType<typeof import('./map-minis.js').miniSeriesForRegion>>,
	 *   chartMetric?: 'power' | 'price' | 'emissions',
	 *   regionChartsLoading?: boolean,
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
		showRegionCharts = false,
		regionCharts = {},
		chartMetric = /** @type {'power' | 'price' | 'emissions'} */ ('power'),
		regionChartsLoading = false,
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
	// Focus zoom — corridor > region > default
	// ============================================

	const FOCUS_ZOOM_DURATION = 800;

	/**
	 * Hand-tuned bounds per dropdown region (`?region` values) — [[west, south],
	 * [east, north]], framing each grid's populated extent the same way
	 * DEFAULT_VIEW is tuned rather than derived. WEM gets its own box — the
	 * SWIS runs Geraldton→Albany→Kalgoorlie, nowhere near the NEM anchors.
	 *
	 * Bounds + fitBounds (not flyTo with camera padding): fitBounds bakes its
	 * padding into the computed center/zoom and strips it from the ease, so the
	 * map's transform padding never changes. A flyTo carrying camera `padding`
	 * would set transform padding, and the svelte-maplibre-gl wrapper's
	 * controlled-camera effect (whose `padding` prop defaults to zeros) resets
	 * it via jumpTo on the next move event — which stops the in-flight
	 * animation dead.
	 * @type {Record<string, [[number, number], [number, number]]>}
	 */
	const REGION_BOUNDS = Object.freeze({
		nsw1: [
			[141.0, -37.6],
			[153.7, -28.1]
		],
		qld1: [
			[141.0, -29.3],
			[153.6, -16.5]
		],
		sa1: [
			[132.0, -38.2],
			[141.1, -29.0]
		],
		tas1: [
			[144.4, -43.8],
			[148.6, -40.5]
		],
		vic1: [
			[140.9, -39.3],
			[150.2, -33.9]
		],
		wem: [
			[114.0, -35.3],
			[122.2, -28.3]
		]
	});

	// Fly to the current focus: the selected corridor wins, then the dropdown
	// region, then the full national framing — corridor/region fits padded
	// clear of the overlaid panel. Tracked with a non-reactive last-key so
	// pans/other prop churn never re-trigger the animation; deep links (`?ic=`,
	// `?region=`) animate from the default view on load, while the initial
	// unfocused state doesn't fly at all.
	/** @type {string | undefined} */
	let lastFocusKey = undefined;
	$effect(() => {
		const map = mapInstance;
		const icKey = selectedInterconnector;
		const region = selectedRegion;
		if (!map || !mapReady) return;
		const key = icKey ? `ic:${icKey}` : region !== '_all' ? `region:${region}` : 'default';
		if (key === lastFocusKey) return;
		const isFirst = lastFocusKey === undefined;
		lastFocusKey = key;

		// Clamp the panel insets so left+right / top+bottom padding can never
		// exceed the canvas (fitBounds throws when it does).
		const canvas = map.getCanvas();
		const left = Math.min(60 + panelInsetLeftPx, canvas.clientWidth * 0.6);
		const bottom = Math.min(60 + panelInsetBottomPx, canvas.clientHeight * 0.55);

		if (icKey) {
			const ic = getInterconnector(icKey);
			if (!ic) return;
			map.fitBounds(coordsBounds(corridorCoords(ic)), {
				padding: { top: 60, right: 60, bottom, left },
				duration: FOCUS_ZOOM_DURATION,
				maxZoom: 7
			});
		} else if (region !== '_all') {
			const bounds = REGION_BOUNDS[region];
			if (!bounds) return;
			map.fitBounds(bounds, {
				padding: { top: 60, right: 60, bottom, left },
				duration: FOCUS_ZOOM_DURATION,
				maxZoom: 6.5
			});
		} else if (!isFirst) {
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
			{#if !showRegionCharts}
				<RegionPriceMarkers {prices} {highlightRegion} />
			{/if}
		{/if}
		<!-- Map-charts view: the on-anchor chart cards absorb the price chips
		     (each card carries its region's chip beneath the chart). -->
		{#if showRegionCharts}
			<RegionChartMarkers
				charts={regionCharts}
				{prices}
				metric={chartMetric}
				loading={regionChartsLoading}
				{highlightRegion}
			/>
		{/if}
		<NavigationControl position="top-right" showCompass={false} />
		<AttributionControl position="bottom-right" compact={true} />
	</MapLibre>
</div>
