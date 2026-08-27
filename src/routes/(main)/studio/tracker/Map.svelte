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
	import { ALL_CARD_CODES, CARD_PX, NEM_CARD_CODES, cardPlacement } from './card-geometry.js';
	import { isWholeNetworkScope } from './tracker-regions.js';

	/**
	 * Default framing — the whole-of-Australia view for the All Regions ('au')
	 * default scope: the SWIS in the west through the NEM east coast, TAS to
	 * the QLD chip; also the "full view" a corridor Back returns to. The
	 * centre still sits south of the landmass midpoint — the content ends at
	 * the QLD chip (~-23.5), so centring higher just banks empty far-north
	 * country while pushing VIC/TAS into the bottom edge.
	 */
	const DEFAULT_VIEW = Object.freeze({ center: { lng: 133.5, lat: -30.5 }, zoom: 3.7 });

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
		selectedRegion = 'au',
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

	// The NEM flow layers make no sense on a WEM-focused map; 'au', `_all` and
	// NEM regions keep them, with the non-adjacent corridors/chips dimmed.
	// The whole-network scopes ('au', '_all') highlight nothing — a pseudo
	// region code here would dim every arc, chip and card.
	let isWem = $derived(selectedRegion === 'wem');
	let showFlowLayers = $derived(showFlows && !isWem);
	let highlightRegion = $derived(
		!isWholeNetworkScope(selectedRegion) && !isWem ? selectedRegion.toUpperCase() : null
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
		],
		// NEM-wide (with TAS) — '_all' is no longer the default scope, so it
		// zooms like any other region pick.
		_all: [
			[129.0, -43.8],
			[153.7, -16.5]
		]
	});

	/**
	 * Whole-of-Australia box for the All Regions ('au') default scope — SWIS
	 * in the west through the NEM east coast, TAS to the populated QLD extent.
	 * Framed via fitBounds like the region boxes so the panel insets bake into
	 * the computed centre/zoom (see the REGION_BOUNDS comment for why never
	 * flyTo with camera padding). DEFAULT_VIEW approximates this box's
	 * unpadded fit for the mount view.
	 * @type {[[number, number], [number, number]]}
	 */
	const AU_BOUNDS = [
		[114.0, -43.8],
		[153.7, -16.5]
	];

	/**
	 * Extend a map-view fit so the given regions' chart cards stay fully on
	 * screen: each card's anchor joins the bounds, and every attachment side
	 * in play reserves the card's pixel footprint as extra canvas padding.
	 * The padding maxes are global (not per-anchor position) — that
	 * guarantees a card anchored right at the fitted edge still fits, and
	 * merely over-reserves for interior anchors.
	 *
	 * @param {[[number, number], [number, number]]} bounds
	 * @param {{ top: number, right: number, bottom: number, left: number }} padding
	 * @param {string[]} codes
	 */
	function withCardExtents(bounds, padding, codes) {
		const placements = codes.map((code) => cardPlacement(code));
		const pad = { ...padding };
		for (const { side } of placements) {
			if (side === 'left') {
				// Card body extends east of its anchor.
				pad.right = Math.max(pad.right, 60 + CARD_PX.width);
			} else if (side === 'right') {
				pad.left = Math.max(pad.left, 60 + CARD_PX.width);
			} else {
				// Bottom-anchored: body floats above the anchor, centred on it.
				pad.top = Math.max(pad.top, 60 + CARD_PX.height);
				pad.left = Math.max(pad.left, 60 + CARD_PX.width / 2);
				pad.right = Math.max(pad.right, 60 + CARD_PX.width / 2);
			}
		}
		return {
			bounds: /** @type {[[number, number], [number, number]]} */ (
				coordsBounds([...bounds, ...placements.map((p) => p.lnglat)])
			),
			padding: pad
		};
	}

	/** The card codes a scope's fit must keep visible (map view only).
	 *  @param {string} region */
	function cardCodesForRegion(region) {
		if (region === 'au') return ALL_CARD_CODES;
		if (region === '_all') return NEM_CARD_CODES;
		if (region === 'wem') return ['WEM'];
		return [region.toUpperCase()];
	}

	// Fit the current focus: the selected corridor wins, then the dropdown
	// region, then the national AU_BOUNDS frame — every fit padded clear of
	// the overlaid panel, and region/national fits in the map-charts view
	// additionally extended so the scope's cards stay on screen. Tracked with
	// a non-reactive last-key so pans/other prop churn never re-trigger the
	// animation; the key also carries a panel-on bit and the card-view bit so
	// opening/closing the panel or switching Panel⇄Map view re-centres the
	// current focus for the new chrome. Hand drag-resizes keep the panel bit
	// true and deliberately don't re-frame. Deep links (`?ic=`, `?region=`)
	// animate from the default view on load; the initial unfocused state only
	// fits (instantly) when a panel or the card extents change the mount
	// view's framing.
	/** @type {string | undefined} */
	let lastFocusKey = undefined;
	$effect(() => {
		const map = mapInstance;
		const icKey = selectedInterconnector;
		const region = selectedRegion;
		if (!map || !mapReady) return;
		const insetOn = panelInsetLeftPx > 0 || panelInsetBottomPx > 0;
		const focus = icKey ? `ic:${icKey}` : `region:${region}`;
		const key = `${focus}|panel:${insetOn}|cards:${showRegionCharts}`;
		if (key === lastFocusKey) return;
		const isFirst = lastFocusKey === undefined;
		lastFocusKey = key;

		// Clamp the panel insets so left+right / top+bottom padding can never
		// exceed the canvas (fitBounds throws when it does).
		const canvas = map.getCanvas();
		const left = Math.min(60 + panelInsetLeftPx, canvas.clientWidth * 0.6);
		const bottom = Math.min(60 + panelInsetBottomPx, canvas.clientHeight * 0.55);
		const padding = { top: 60, right: 60, bottom, left };

		/** @param {[[number, number], [number, number]]} bounds */
		const fitFor = (bounds) =>
			showRegionCharts
				? withCardExtents(bounds, padding, cardCodesForRegion(region))
				: { bounds, padding };

		if (icKey) {
			const ic = getInterconnector(icKey);
			if (!ic) return;
			map.fitBounds(coordsBounds(corridorCoords(ic)), {
				padding,
				duration: FOCUS_ZOOM_DURATION,
				maxZoom: 7
			});
		} else if (region !== 'au') {
			const regionBounds = REGION_BOUNDS[region];
			if (!regionBounds) return;
			const fit = fitFor(regionBounds);
			map.fitBounds(fit.bounds, {
				padding: fit.padding,
				duration: FOCUS_ZOOM_DURATION,
				maxZoom: 6.5
			});
		} else if (!isFirst || insetOn || showRegionCharts) {
			// The mount view already shows the unpadded national frame — a
			// panel overlay or the card extents need an (instant) corrective
			// fit on first paint.
			const fit = fitFor(AU_BOUNDS);
			map.fitBounds(fit.bounds, {
				padding: fit.padding,
				duration: isFirst ? 0 : FOCUS_ZOOM_DURATION
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
