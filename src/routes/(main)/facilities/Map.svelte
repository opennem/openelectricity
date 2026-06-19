<script>
	import {
		MapLibre,
		Popup,
		NavigationControl,
		AttributionControl,
		GeoJSONSource,
		CircleLayer,
		SymbolLayer,
		LineLayer,
		FillLayer
	} from 'svelte-maplibre-gl';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import UnitGroup from './_components/UnitGroup.svelte';
	import FacilityCard from './_components/FacilityCard.svelte';
	import FacilityCardImage from './_components/FacilityCardImage.svelte';
	import { getRegionLabel } from './_utils/filters';
	import { DEFAULT_TUNING } from './_utils/map-tuning.js';
	import { hexToRgb } from '$lib/utils/colour-darken.js';
	import { collapseMapAttribution } from '$lib/components/map/collapse-attribution.js';
	import { X } from '@lucide/svelte';

	/**
	 * @typedef {{ high: boolean, medium: boolean, low: boolean, lowest: boolean }} TransmissionLineVisibility
	 */

	/**
	 * @type {{
	 *   facilities: any[],
	 *   hoveredFacility?: any | null,
	 *   selectedFacilityCode?: string | null,
	 *   selectedView?: 'timeline' | 'list' | 'card' | 'map',
	 *   cardCodes?: Set<string>,
	 *   clustering?: boolean,
	 *   mapTheme?: 'light' | 'dark' | 'satellite',
	 *   mapMarkerStyle?: 'circles' | 'columns' | 'heatmap',
	 *   showTransmissionLines?: boolean,
	 *   transmissionLineVisibility?: TransmissionLineVisibility,
	 *   showGolfCourses?: boolean,
	 *   scrollZoom?: boolean,
	 *   cooperativeGestures?: boolean,
	 *   suppressFitBounds?: boolean,
	 *   flyToOffsetX?: number,
	 *   flyToOffsetY?: number,
	 *   metricValues?: Map<string, number | null>,
	 *   metricMissingByCode?: Set<string>,
	 *   experimentsEnabled?: boolean,
	 *   tuning?: import('./_utils/map-tuning.js').Tuning,
	 *   onhover?: (facility: any | null) => void,
	 *   onclick?: (facility: any | null) => void,
	 *   onselect?: (facility: any | null) => void,
	 *   onload?: () => void
	 * }}
	 */
	let {
		facilities = [],
		hoveredFacility = null,
		selectedFacilityCode = null,
		selectedView = 'timeline',
		cardCodes = new Set(),
		clustering = false,
		mapTheme = 'light',
		mapMarkerStyle = 'circles',
		showTransmissionLines = true,
		transmissionLineVisibility = { high: true, medium: true, low: true, lowest: true },
		showGolfCourses = false,
		scrollZoom = false,
		cooperativeGestures = false,
		suppressFitBounds = false,
		flyToOffsetX = 0,
		flyToOffsetY = 0,
		metricValues = new Map(),
		metricMissingByCode = new Set(),
		experimentsEnabled = false,
		tuning = DEFAULT_TUNING,
		onhover,
		onclick,
		onselect,
		onload
	} = $props();

	// Circle radius interpolation stops (5-stop linear from min → max). The
	// hovered variant matches the existing curve's +2 px bump.
	function buildCircleStops(/** @type {number} */ min, /** @type {number} */ max) {
		const span = max - min;
		return [
			0,
			min,
			0.25,
			min + span * 0.25,
			0.5,
			min + span * 0.5,
			0.75,
			min + span * 0.75,
			1,
			max
		];
	}
	let circleStops = $derived(buildCircleStops(tuning.circleMin, tuning.circleMax));
	let circleStopsHovered = $derived(buildCircleStops(tuning.circleMin + 2, tuning.circleMax + 2));

	// Derived booleans for things that still consume the legacy boolean
	// shape (existing satellite-aware logic, deck.gl visibility, etc).
	// Marker styles are mutually exclusive — exactly one of these is true.
	let satelliteView = $derived(mapTheme === 'satellite');
	let showColumns = $derived(mapMarkerStyle === 'columns');
	let showHeatmap = $derived(mapMarkerStyle === 'heatmap');
	// "Circles" maps to two render paths: the maplibre `CircleLayer`
	// (default) or — when experiments are on AND the panel's circle
	// renderer is `'deck'` — deck.gl's `ScatterplotLayer`. Likewise for
	// transmission.
	let showCirclesAsScatter = $derived(
		experimentsEnabled && mapMarkerStyle === 'circles' && tuning.circleRenderer === 'deck'
	);
	let showCircles = $derived(mapMarkerStyle === 'circles' && !showCirclesAsScatter);
	let useDeckTransmission = $derived(experimentsEnabled && tuning.transmissionRenderer === 'deck');
	let showDeckOverlay = $derived(showColumns || showHeatmap || showCirclesAsScatter);
	// Mode for the deck.gl overlay. Clustering is intentionally ignored
	// for the deck modes — they have their own visual semantics and don't
	// pair well with the count-based maplibre aggregate. Clustering only
	// drives the maplibre circle layer.
	let deckMode = $derived(
		/** @type {'column' | 'heatmap' | 'scatter'} */ (
			showHeatmap ? 'heatmap' : showCirclesAsScatter ? 'scatter' : 'column'
		)
	);

	// `metricValues` is sqrt-normalised (0..1) by `normaliseMetric`; we
	// scale up to a MW-equivalent visual range so column heights and heatmap
	// intensities stay comparable across capacity / generation / pollution.
	const HEX_WEIGHT_SCALE = 10000;

	// Both `facilityColours` and `hexagonData` only feed deck.gl marker
	// modes — skip the work entirely in maplibre-only renders so dragging
	// metric / filter sliders doesn't re-parse 600 hex strings + rebuild
	// 600-entry arrays per tick.
	let facilityColours = $derived.by(() => {
		/** @type {Map<string, [number, number, number]>} */
		const out = new Map();
		if (!showDeckOverlay) return out;
		for (const f of facilities) {
			out.set(f.code, hexToRgb(getFacilityColor(f) || '#888888'));
		}
		return out;
	});

	let hexagonData = $derived.by(() => {
		if (!showDeckOverlay) return [];
		return facilities
			.filter((f) => f.location?.lng != null && f.location?.lat != null)
			.filter((f) => !metricMissingByCode.has(f.code))
			.map((f) => {
				const normalised = metricValues.get(f.code);
				const weight = typeof normalised === 'number' ? normalised * HEX_WEIGHT_SCALE : 1;
				return {
					position: /** @type {[number, number]} */ ([f.location.lng, f.location.lat]),
					weight,
					code: f.code,
					color: facilityColours.get(f.code) ?? [136, 136, 136]
				};
			});
	});

	// Build filter for transmission lines based on visibility settings
	let transmissionFilter = $derived.by(() => {
		/** @type {any[]} */
		const voltageConditions = [];

		if (transmissionLineVisibility.high) {
			voltageConditions.push(['>=', ['get', 'capacitykv'], 400]);
		}
		if (transmissionLineVisibility.medium) {
			voltageConditions.push([
				'all',
				['>=', ['get', 'capacitykv'], 220],
				['<', ['get', 'capacitykv'], 400]
			]);
		}
		if (transmissionLineVisibility.low) {
			voltageConditions.push([
				'all',
				['>=', ['get', 'capacitykv'], 110],
				['<', ['get', 'capacitykv'], 220]
			]);
		}
		if (transmissionLineVisibility.lowest) {
			voltageConditions.push(['<', ['get', 'capacitykv'], 110]);
		}

		if (voltageConditions.length === 0) {
			// Never match any features
			return /** @type {any} */ (['==', ['get', 'operationalstatus'], '__never_match__']);
		}

		return /** @type {any} */ ([
			'all',
			['==', ['get', 'operationalstatus'], 'Operational'],
			['any', ...voltageConditions]
		]);
	});

	// Australia center coordinates (default fallback)
	const center = { lng: 134, lat: -25 };

	// Animation durations (in milliseconds)
	const ZOOM_DURATION = 400; // flyTo when selecting a facility
	const PAN_DURATION = 200; // easeTo for cluster popup adjustment
	const RESET_DURATION = 500; // fitBounds when resetting view

	/** @type {any | null} */
	let mapInstance = $state(null);
	/** @type {string | null} */
	let mapHoveredFacilityCode = $state(null);
	let mapLoaded = $state(false);
	let isDragging = $state(false);
	let isZooming = $state(false);

	// Map style derives from the theme tri-state. Dark uses a locally-hosted
	// copy of CARTO's dark-matter style with the glyphs URL swapped to our
	// own `/fonts/...` path — CARTO's hosted fonts CDN 404s on `DM_Mono`,
	// which broke labels when we pointed straight at the upstream JSON.
	let mapStyle = $derived(
		mapTheme === 'satellite'
			? '/map-styles/satellite.json'
			: mapTheme === 'dark'
				? '/map-styles/dark-matter.json'
				: '/map-styles/positron.json'
	);

	// Tilt the camera into 3D when hex columns are visible so their height
	// reads, and ease back to top-down when only circles are showing.
	// Tracks user pitch via the map's `pitch` event so we don't fight the
	// user — once they've dragged to a custom angle, we leave it alone
	// until they next change marker style.
	const PITCH_3D = 50;
	const PITCH_FLAT = 0;
	const PITCH_TRANSITION_MS = 800;
	$effect(() => {
		const wantsTilt = showColumns;
		const map = mapInstance;
		if (!map || !mapLoaded) return;
		const targetPitch = wantsTilt ? PITCH_3D : PITCH_FLAT;
		const currentPitch = map.getPitch();
		if (Math.abs(currentPitch - targetPitch) < 0.5) return;
		map.easeTo({ pitch: targetPitch, duration: PITCH_TRANSITION_MS, essential: true });
	});

	// Cluster panel state
	/** @type {any[]} */
	let clusterFacilities = $state([]);
	/** @type {{lng: number, lat: number} | null} */
	let clusterLocation = $state(null);
	let showClusterPanel = $derived(clusterFacilities.length > 0);
	let clusterClickInProgress = $state(false);

	// Create a lookup map for facilities by code (memoized)
	let facilitiesMap = $derived(new Map(facilities.map((f) => [f.code, f])));

	// Get map-hovered facility from code
	let mapHoveredFacility = $derived(
		mapHoveredFacilityCode ? facilitiesMap.get(mapHoveredFacilityCode) : null
	);

	/**
	 * Get the primary fuel tech for a facility (most common fuel tech among units)
	 * @param {any} facility
	 * @returns {string}
	 */
	function getPrimaryFuelTech(facility) {
		if (!facility.units || facility.units.length === 0) return 'unknown';

		/** @type {Record<string, number>} */
		const fuelTechCounts = {};
		for (const unit of facility.units) {
			const fueltech = unit.fueltech_id;
			if (fueltech) {
				fuelTechCounts[fueltech] = (fuelTechCounts[fueltech] || 0) + 1;
			}
		}

		let maxCount = 0;
		let primaryFuelTech = 'unknown';
		for (const [fueltech, count] of Object.entries(fuelTechCounts)) {
			if (count > maxCount) {
				maxCount = count;
				primaryFuelTech = fueltech;
			}
		}

		return primaryFuelTech;
	}

	/**
	 * Get the color for a facility based on its primary fuel tech
	 * @param {any} facility
	 * @returns {string}
	 */
	function getFacilityColor(facility) {
		const fueltech = getPrimaryFuelTech(facility);
		return fuelTechColourMap[fueltech] || '#6A6A6A';
	}

	/**
	 * Get total capacity for a facility (sum of all units)
	 * @param {any} facility
	 * @returns {number}
	 */
	function getTotalCapacity(facility) {
		if (!facility.units || facility.units.length === 0) return 0;
		return facility.units.reduce((/** @type {number} */ sum, /** @type {any} */ unit) => {
			return sum + (Number(unit.capacity_maximum) || Number(unit.capacity_registered) || 0);
		}, 0);
	}

	// Memoized unit grouping cache - computed once per facility set
	let groupedUnitsCache = $derived.by(() => {
		/** @type {Map<string, Array<{fueltech_id: string, status_id: string, isCommissioning: boolean, capacity_maximum: number, capacity_registered: number, max_generation: number, bgColor: string}>>} */
		const cache = new Map();

		for (const facility of facilities) {
			if (!facility.units || facility.units.length === 0) {
				cache.set(facility.code, []);
				continue;
			}

			/** @type {Map<string, any>} */
			const groups = new Map();

			for (const unit of facility.units) {
				const key = `${unit.fueltech_id}|||${unit.status_id}`;

				if (!groups.has(key)) {
					groups.set(key, {
						fueltech_id: unit.fueltech_id,
						status_id: unit.status_id,
						isCommissioning: unit.isCommissioning,
						capacity_maximum: 0,
						capacity_registered: 0,
						capacity_storage: 0,
						max_generation: 0,
						bgColor: fuelTechColourMap[unit.fueltech_id] || '#6A6A6A'
					});
				}

				const group = groups.get(key);
				group.capacity_maximum += Number(unit.capacity_maximum) || 0;
				group.capacity_registered += Number(unit.capacity_registered) || 0;
				group.capacity_storage += Number(unit.capacity_storage) || 0;
				group.max_generation += Number(unit.max_generation) || 0;
			}

			cache.set(facility.code, Array.from(groups.values()));
		}

		return cache;
	});

	// Convert facilities to GeoJSON for clustering. Facilities without a value
	// for the active metric are dropped here so they're hidden from both the
	// circle layer and any clustering — e.g. clean renewables disappear when
	// 'Pollution' is the active metric.
	let facilitiesGeoJSON = $derived.by(() => {
		/** @type {GeoJSON.FeatureCollection} */
		const geojson = {
			type: 'FeatureCollection',
			features: facilities
				.filter((facility) => !metricMissingByCode.has(facility.code))
				.map((facility) => {
					const normalised = metricValues.get(facility.code);
					return {
						type: 'Feature',
						geometry: {
							type: 'Point',
							coordinates: [facility.location.lng, facility.location.lat]
						},
						properties: {
							code: facility.code,
							name: facility.name,
							color: getFacilityColor(facility),
							network_id: facility.network_id,
							network_region: facility.network_region,
							capacity: getTotalCapacity(facility),
							// Active metric, normalised to 0..1 — drives marker radius.
							metric_value: typeof normalised === 'number' ? normalised : 0
						}
					};
				})
		};
		return geojson;
	});

	// Validate hoveredFacility - must exist in facilities list or have valid location
	let validatedHoveredFacility = $derived.by(() => {
		if (!hoveredFacility) return null;

		const hasValidLocation =
			hoveredFacility.location &&
			typeof hoveredFacility.location.lat === 'number' &&
			typeof hoveredFacility.location.lng === 'number' &&
			!isNaN(hoveredFacility.location.lat) &&
			!isNaN(hoveredFacility.location.lng);

		if (!hasValidLocation) return null;

		return facilitiesMap.has(hoveredFacility.code) ? hoveredFacility : null;
	});

	// Show popup for hovered facility (from list or map)
	let popupFacility = $derived(validatedHoveredFacility || mapHoveredFacility);

	// Lazy popup content - only computed when popup is shown
	let popupContent = $derived.by(() => {
		if (!popupFacility) return null;
		return {
			name: popupFacility.name,
			region: getRegionLabel(popupFacility.network_id, popupFacility.network_region),
			location: popupFacility.location,
			groupedUnits: groupedUnitsCache.get(popupFacility.code) || []
		};
	});

	// In timeline/list views the popup shows the facility's social card image;
	// card view keeps the unit-breakdown popup.
	let showCardPopup = $derived(selectedView === 'timeline' || selectedView === 'list');

	// Combined hover state from list or map
	let activeHoveredFacilityCode = $derived(
		validatedHoveredFacility?.code || mapHoveredFacilityCode
	);

	/**
	 * Calculate bounds from facilities and fit map to them
	 * @param {any[]} facilityList
	 */
	function fitMapToFacilities(facilityList) {
		if (!mapInstance || !facilityList || facilityList.length === 0) return;

		const validFacilities = facilityList.filter(
			(f) => f.location && typeof f.location.lat === 'number' && typeof f.location.lng === 'number'
		);

		if (validFacilities.length === 0) return;

		let minLng = Infinity;
		let maxLng = -Infinity;
		let minLat = Infinity;
		let maxLat = -Infinity;

		for (const facility of validFacilities) {
			const { lng, lat } = facility.location;
			minLng = Math.min(minLng, lng);
			maxLng = Math.max(maxLng, lng);
			minLat = Math.min(minLat, lat);
			maxLat = Math.max(maxLat, lat);
		}

		const padding = 0.1;
		const lngPadding = (maxLng - minLng) * padding;
		const latPadding = (maxLat - minLat) * padding;

		try {
			mapInstance.fitBounds(
				[
					[minLng - lngPadding, minLat - latPadding],
					[maxLng + lngPadding, maxLat + latPadding]
				],
				{
					padding: 50,
					maxZoom: 10,
					duration: RESET_DURATION
				}
			);
		} catch {
			// Silently handle bounds fitting errors
		}
	}

	/**
	 * Close all popups - exported for external use
	 */
	export function closePopups() {
		mapHoveredFacilityCode = null;
		clusterFacilities = [];
		clusterLocation = null;
		onhover?.(null);
	}

	/**
	 * Reset view to show all facilities - exported for external use
	 */
	export function resetView() {
		closePopups();
		fitMapToFacilities(facilities);
	}

	/**
	 * Zoom to a specific facility and show popup - exported for external use
	 * @param {any} facility
	 */
	export function zoomToFacility(facility) {
		if (!mapInstance || !facility?.location) return;

		mapInstance.flyTo({
			center: [facility.location.lng, facility.location.lat],
			zoom: 12,
			duration: ZOOM_DURATION,
			offset: getFlyToOffset()
		});

		mapHoveredFacilityCode = facility.code;
		onhover?.(facility);
	}

	/**
	 * Handle map load event - use idle event instead of setTimeout
	 */
	function handleMapLoad() {
		mapLoaded = true;
		onload?.();

		// Force resize on mobile to ensure correct dimensions on initial load
		if (typeof window !== 'undefined' && window.innerWidth < 768) {
			setTimeout(() => {
				mapInstance?.resize();
			}, 0);
		}

		// Only fit to all facilities if no specific facility is selected
		if (facilities.length > 0 && !selectedFacilityCode) {
			// Use idle event instead of setTimeout for reliable timing
			mapInstance.once('idle', () => {
				fitMapToFacilities(facilities);
			});
		}

		// Use idle event for attribution compacting
		mapInstance.once('idle', () => collapseMapAttribution(mapInstance));

		// Track dragging state to prevent popup dismissal during pan
		mapInstance.on('dragstart', () => {
			isDragging = true;
		});
		mapInstance.on('dragend', () => {
			isDragging = false;
		});

		// Track zooming state to hide cluster numbers during zoom
		mapInstance.on('zoomstart', () => {
			isZooming = true;
		});
		mapInstance.on('zoomend', () => {
			isZooming = false;
		});
	}

	// Fit bounds when facilities change - use idle event
	$effect(() => {
		if (
			mapInstance &&
			mapLoaded &&
			facilities.length > 0 &&
			!selectedFacilityCode &&
			!suppressFitBounds
		) {
			mapInstance.once('idle', () => {
				fitMapToFacilities(facilities);
			});
		}
	});

	/**
	 * Get offset for flyTo to account for panels
	 * Returns [x, y] pixel offset - positive x shifts view right, positive y shifts view up
	 * @returns {[number, number]}
	 */
	function getFlyToOffset() {
		if (typeof window === 'undefined') return [0, 0];

		if (window.innerWidth > 768) {
			return [window.innerWidth * flyToOffsetX, window.innerHeight * flyToOffsetY];
		}
		// On mobile, no offset needed
		return [0, 0];
	}

	/**
	 * Get offset for cluster popup to ensure it's visible
	 * Returns [x, y] pixel offset - positive x shifts right, negative y shifts up
	 * @returns {[number, number]}
	 */
	function getClusterPopupOffset() {
		if (typeof window === 'undefined') return [0, 0];

		// Popup is max 300px tall, anchored at bottom, so we need to shift view up
		const yOffset = -120; // Shift view up to show popup above the point
		return [0, yOffset];
	}

	// Handle selectedFacilityCode from URL - zoom to facility and show popup
	$effect(() => {
		if (mapInstance && mapLoaded && selectedFacilityCode && facilities.length > 0) {
			const facility = facilitiesMap.get(selectedFacilityCode);
			if (facility && facility.location) {
				mapInstance.flyTo({
					center: [facility.location.lng, facility.location.lat],
					zoom: 12,
					duration: ZOOM_DURATION,
					offset: getFlyToOffset()
				});
				mapHoveredFacilityCode = facility.code;
				onhover?.(facility);
			}
		}
	});

	/**
	 * Handle mouse enter on facility point
	 * @param {any} e
	 */
	function handlePointMouseEnter(e) {
		if (!mapInstance) return;
		mapInstance.getCanvas().style.cursor = 'pointer';

		const features = e.features;
		if (features && features.length > 0) {
			const code = features[0].properties.code;
			mapHoveredFacilityCode = code;
			// Notify parent of hover
			const facility = facilitiesMap.get(code);
			onhover?.(facility || null);
		}
	}

	/**
	 * Handle mouse leave on facility point
	 */
	function handlePointMouseLeave() {
		if (!mapInstance) return;
		mapInstance.getCanvas().style.cursor = '';
		mapHoveredFacilityCode = null;
		// Notify parent of hover end
		onhover?.(null);
	}

	/**
	 * Handle click on facility point
	 * @param {any} e
	 */
	function handlePointClick(e) {
		const features = e.features;
		if (features && features.length > 0) {
			const code = features[0].properties.code;
			const facility = facilitiesMap.get(code);
			// Set hover state to show popup (important for mobile touch)
			mapHoveredFacilityCode = code;
			onhover?.(facility || null);
			onclick?.(facility || null);
			// Select the facility to highlight in list/timeline
			onselect?.(facility || null);
		}
	}

	/**
	 * Handle click on map (to dismiss popup on mobile)
	 * @param {any} e
	 */
	function handleMapClick(e) {
		// Ignore clicks that happen right after dragging or during cluster processing
		if (isDragging || clusterClickInProgress) return;

		// Check if click was on a facility point or cluster. Some marker
		// modes don't render the circle layers at all (e.g. hex-only) — skip
		// the query in that case so we don't throw on a missing layer id.
		const layerIds =
			mapInstance?.getStyle?.()?.layers?.map((/** @type {{ id: string }} */ l) => l.id) ?? [];
		const candidates = clustering
			? ['facility-points-unclustered', 'cluster-circles']
			: ['facility-points'];
		const layersToCheck = candidates.filter((id) => layerIds.includes(id));
		if (layersToCheck.length === 0) return;
		const features = mapInstance?.queryRenderedFeatures(e.point, { layers: layersToCheck });
		if (!features || features.length === 0) {
			// Clicked on empty space - clear selection and close panel
			mapHoveredFacilityCode = null;
			onhover?.(null);
			clusterFacilities = [];
			clusterLocation = null;
		}
	}

	/**
	 * Handle click on cluster circle - fetches all facilities in the cluster
	 * @param {any} e
	 */
	async function handleClusterClick(e) {
		if (!mapInstance) return;

		clusterClickInProgress = true;

		const features = e.features;
		if (!features || features.length === 0) {
			clusterClickInProgress = false;
			return;
		}

		const clusterId = features[0].properties.cluster_id;
		const pointCount = features[0].properties.point_count;
		const coordinates = features[0].geometry.coordinates;

		const source = mapInstance.getSource('facilities-clustered');
		if (!source) {
			clusterClickInProgress = false;
			return;
		}

		try {
			// Use promise-based API to get cluster leaves
			const leaves = await source.getClusterLeaves(clusterId, pointCount, 0);

			clusterClickInProgress = false;

			if (!leaves || leaves.length === 0) return;

			// Map GeoJSON features back to facility objects
			const facilityCodes = /** @type {any[]} */ (leaves).map((f) => f.properties.code);
			const clusterFacilityList = facilityCodes
				.map((code) => facilitiesMap.get(code))
				.filter(Boolean);

			clusterFacilities = clusterFacilityList;
			clusterLocation = { lng: coordinates[0], lat: coordinates[1] };

			// Pan map to ensure popup is visible (account for popup height above point and left panel)
			// Offset: positive x shifts view right, negative y shifts view up
			const popupOffset = getClusterPopupOffset();
			mapInstance.easeTo({
				center: coordinates,
				offset: popupOffset,
				duration: PAN_DURATION
			});
		} catch {
			clusterClickInProgress = false;
		}
	}

	/**
	 * Close cluster panel
	 */
	function closeClusterPanel() {
		clusterFacilities = [];
		clusterLocation = null;
	}

	/**
	 * Handle facility click from cluster panel - zoom to facility and show popup
	 * @param {any} facility
	 */
	function handleClusterFacilityClick(facility) {
		if (!mapInstance || !facility.location) return;

		// Close cluster panel first
		clusterFacilities = [];
		clusterLocation = null;

		// Zoom to the facility location with offset for panel
		mapInstance.flyTo({
			center: [facility.location.lng, facility.location.lat],
			zoom: 12,
			duration: ZOOM_DURATION,
			offset: getFlyToOffset()
		});

		// Show the facility popup after zoom
		mapHoveredFacilityCode = facility.code;
		onhover?.(facility);

		// Notify parent to update URL with selected facility
		onselect?.(facility);
	}
</script>

<div class="w-full h-full overflow-hidden">
	<MapLibre
		style={mapStyle}
		class="w-full h-full"
		{center}
		zoom={3.5}
		maxZoom={18}
		minZoom={3}
		{scrollZoom}
		{cooperativeGestures}
		touchZoomRotate={true}
		attributionControl={false}
		fadeDuration={0}
		bind:map={mapInstance}
		onload={handleMapLoad}
		onclick={handleMapClick}
	>
		<NavigationControl position="top-right" showCompass={false} />
		<AttributionControl position="bottom-right" compact={true} />

		<!-- Golf courses clustered layer (uses centroid points for clustering) -->
		<GeoJSONSource
			id="golf-courses-clustered"
			data="/data/golf-courses-points.geojson"
			cluster={true}
			clusterMaxZoom={12}
			clusterRadius={60}
		>
			<!-- Golf course cluster circles -->
			<CircleLayer
				id="golf-cluster-circles"
				filter={['has', 'point_count']}
				paint={{
					'circle-color': satelliteView ? '#86efac' : '#4ade80',
					'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 50, 28, 100, 36],
					'circle-opacity': 0.9,
					'circle-stroke-width': 2,
					'circle-stroke-color': satelliteView ? '#bbf7d0' : '#22c55e'
				}}
				layout={{
					visibility: showGolfCourses ? 'visible' : 'none'
				}}
			/>

			<!-- Golf course cluster count labels -->
			<SymbolLayer
				id="golf-cluster-count"
				filter={['has', 'point_count']}
				layout={{
					'text-field': '{point_count_abbreviated}',
					'text-font': ['DM_Mono'],
					'text-size': 12,
					visibility: showGolfCourses ? 'visible' : 'none'
				}}
				paint={{
					'text-color': satelliteView ? '#052e16' : '#14532d'
				}}
			/>
		</GeoJSONSource>

		<!-- Golf courses polygon layer (shows when zoomed in past cluster threshold) -->
		<GeoJSONSource id="golf-courses" data="/data/golf-courses.geojson">
			<FillLayer
				id="golf-courses-layer"
				minzoom={10}
				paint={{
					'fill-color': satelliteView ? '#4ade80' : '#16a34a',
					'fill-opacity': satelliteView ? 0.5 : 0.4,
					'fill-outline-color': satelliteView ? '#86efac' : '#15803d'
				}}
				layout={{
					visibility: showGolfCourses ? 'visible' : 'none'
				}}
			/>
		</GeoJSONSource>

		{#if !useDeckTransmission}
			<GeoJSONSource id="transmission-lines" data="/data/transmission-lines.geojson">
				<LineLayer
					id="transmission-lines-layer"
					filter={transmissionFilter}
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
						'line-width': [
							'interpolate',
							['linear'],
							['zoom'],
							3,
							[
								'case',
								['>=', ['get', 'capacitykv'], 400],
								1.5,
								['>=', ['get', 'capacitykv'], 220],
								1,
								['>=', ['get', 'capacitykv'], 110],
								0.7,
								0.5
							],
							8,
							[
								'case',
								['>=', ['get', 'capacitykv'], 400],
								4,
								['>=', ['get', 'capacitykv'], 220],
								3,
								['>=', ['get', 'capacitykv'], 110],
								2,
								1.5
							],
							14,
							[
								'case',
								['>=', ['get', 'capacitykv'], 400],
								6,
								['>=', ['get', 'capacitykv'], 220],
								5,
								['>=', ['get', 'capacitykv'], 110],
								4,
								3
							]
						],
						'line-opacity': ['interpolate', ['linear'], ['zoom'], 3, 0.5, 8, 0.7, 12, 0.85]
					}}
					layout={{
						'line-cap': 'round',
						'line-join': 'round',
						visibility: showTransmissionLines ? 'visible' : 'none'
					}}
				/>
			</GeoJSONSource>
		{:else if showTransmissionLines}
			{#await import('./_components/MapTransmissionLayer.svelte') then { default: MapTransmissionLayer }}
				<MapTransmissionLayer voltageVisibility={transmissionLineVisibility} {facilities} />
			{/await}
		{/if}

		{#if showCircles}
			{#if clustering}
				<!-- Clustered GeoJSON source -->
				<GeoJSONSource
					id="facilities-clustered"
					data={facilitiesGeoJSON}
					cluster={true}
					clusterMaxZoom={5}
					clusterRadius={50}
				>
					<!-- Cluster circles -->
					<CircleLayer
						id="cluster-circles"
						filter={['has', 'point_count']}
						paint={{
							'circle-color': satelliteView ? '#ffffff' : '#4a4a4a',
							'circle-radius': ['step', ['get', 'point_count'], 20, 10, 25, 50, 35, 100, 45],
							'circle-opacity': satelliteView ? 0.95 : 0.9
						}}
						onclick={handleClusterClick}
						onmouseenter={() => {
							if (mapInstance) mapInstance.getCanvas().style.cursor = 'pointer';
						}}
						onmouseleave={() => {
							if (mapInstance) mapInstance.getCanvas().style.cursor = '';
						}}
					/>

					<!-- Cluster count labels -->
					<SymbolLayer
						id="cluster-count"
						filter={['has', 'point_count']}
						layout={{
							'text-field': '{point_count_abbreviated}',
							'text-font': ['DM_Mono'],
							'text-size': 14,
							visibility: isZooming ? 'none' : 'visible'
						}}
						paint={{
							'text-color': satelliteView ? '#1a1a1a' : '#ffffff'
						}}
					/>

					<!-- Unclustered points (individual facilities) -->
					<CircleLayer
						id="facility-points-unclustered"
						filter={['!', ['has', 'point_count']]}
						paint={{
							'circle-color': ['get', 'color'],
							'circle-radius': [
								'case',
								['==', ['get', 'code'], activeHoveredFacilityCode ?? ''],
								['interpolate', ['linear'], ['get', 'metric_value'], ...circleStopsHovered],
								['interpolate', ['linear'], ['get', 'metric_value'], ...circleStops]
							],
							'circle-radius-transition': { duration: 400, delay: 0 },
							'circle-stroke-width': [
								'case',
								['==', ['get', 'code'], activeHoveredFacilityCode ?? ''],
								2,
								1
							],
							'circle-stroke-color': '#ffffff',
							'circle-opacity': [
								'case',
								['==', ['get', 'code'], activeHoveredFacilityCode ?? ''],
								1,
								activeHoveredFacilityCode ? 0.3 : 0.8
							]
						}}
						layout={{
							'circle-sort-key': [
								'case',
								['==', ['get', 'code'], activeHoveredFacilityCode ?? ''],
								1,
								0
							]
						}}
						onmouseenter={handlePointMouseEnter}
						onmouseleave={handlePointMouseLeave}
						onclick={handlePointClick}
					/>
				</GeoJSONSource>
			{:else}
				<!-- Non-clustered GeoJSON source - WebGL rendering for performance -->
				<GeoJSONSource id="facilities" data={facilitiesGeoJSON}>
					<!-- All facility points rendered on WebGL canvas -->
					<CircleLayer
						id="facility-points"
						paint={{
							'circle-color': ['get', 'color'],
							'circle-radius': [
								'case',
								['==', ['get', 'code'], activeHoveredFacilityCode ?? ''],
								['interpolate', ['linear'], ['get', 'metric_value'], ...circleStopsHovered],
								['interpolate', ['linear'], ['get', 'metric_value'], ...circleStops]
							],
							'circle-radius-transition': { duration: 400, delay: 0 },
							'circle-stroke-width': [
								'case',
								['==', ['get', 'code'], activeHoveredFacilityCode ?? ''],
								2,
								1
							],
							'circle-stroke-color': '#ffffff',
							'circle-opacity': [
								'case',
								['==', ['get', 'code'], activeHoveredFacilityCode ?? ''],
								1,
								activeHoveredFacilityCode ? 0.3 : 0.8
							]
						}}
						layout={{
							'circle-sort-key': [
								'case',
								['==', ['get', 'code'], activeHoveredFacilityCode ?? ''],
								1,
								0
							]
						}}
						onmouseenter={handlePointMouseEnter}
						onmouseleave={handlePointMouseLeave}
						onclick={handlePointClick}
					/>
				</GeoJSONSource>
			{/if}
		{/if}

		<!-- Popup for hovered facility - uses lazy computed content -->
		{#if popupContent}
			<Popup
				lnglat={[popupContent.location.lng, popupContent.location.lat]}
				offset={[0, -15]}
				closeOnClick={false}
				anchor="bottom"
			>
				{#if showCardPopup && popupFacility}
					<!-- Timeline/list: the facility's social card (committed image, else live card) -->
					<div class="w-[300px] overflow-hidden rounded-lg shadow-lg">
						<FacilityCardImage facility={popupFacility} {cardCodes} />
					</div>
				{:else}
					<div class="bg-black rounded-lg px-4 py-3 shadow-lg text-white min-w-[240px]">
						<div class="font-semibold text-sm">{popupContent.name}</div>
						<div class="text-xs text-white/60 mb-3 border-b border-white/20 pb-3">
							{popupContent.region}
						</div>

						{#if popupContent.groupedUnits.length > 0}
							<div
								class="flex flex-col divide-y divide-white/20 [&>*]:py-2 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0"
							>
								{#each popupContent.groupedUnits as group (group.fueltech_id + '|||' + group.status_id)}
									<UnitGroup {...group} />
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			</Popup>
		{/if}

		<!-- Cluster popup panel - shows list of facilities in cluster -->
		{#if showClusterPanel && clusterLocation}
			<Popup
				lnglat={[clusterLocation.lng, clusterLocation.lat]}
				offset={[0, -20]}
				closeOnClick={false}
				anchor="bottom"
			>
				<div
					class="bg-black rounded-lg shadow-lg text-white min-w-[280px] max-w-[320px] max-h-[300px] flex flex-col"
				>
					<div class="flex items-center justify-between px-4 py-3 border-b border-white/20">
						<div>
							<div class="font-semibold text-sm">{clusterFacilities?.length} Facilities</div>
							<div class="text-xs text-white/60">Click to view details</div>
						</div>
						<button
							onclick={closeClusterPanel}
							class="p-1 rounded-full hover:bg-white/10 transition-colors"
						>
							<X class="size-5 text-white/60" />
						</button>
					</div>
					<div class="overflow-y-auto flex-1">
						{#each clusterFacilities || [] as facility (facility.code)}
							<FacilityCard
								{facility}
								compact={true}
								darkMode={true}
								onclick={handleClusterFacilityClick}
							/>
						{/each}
					</div>
				</div>
			</Popup>
		{/if}

		<!-- deck.gl overlay (hex columns or heatmap) is code-split — the
		     ~200 KB bundle only loads the first time the user picks a
		     non-default marker mode. After that the chunk is cached so
		     subsequent toggles are instant. -->
		{#if showDeckOverlay}
			{#await import('./_components/MapHexLayer.svelte') then { default: MapHexLayer }}
				<MapHexLayer
					visible={showDeckOverlay}
					data={hexagonData}
					mode={deckMode}
					radius={tuning.hexRadius}
					elevationScale={tuning.hexElevationScale}
					hexDiskResolution={tuning.hexDiskResolution}
					hexBrightMix={tuning.hexBrightMix}
					hexFillAlpha={tuning.hexFillAlpha}
					hexGlowRadiusMultiplier={tuning.hexGlowRadiusMultiplier}
					hexGlowAlpha={tuning.hexGlowAlpha}
					hexOutlineAlpha={tuning.hexOutlineAlpha}
					hexExtruded={tuning.hexExtruded}
					hexMaterial={tuning.hexMaterial}
					heatmapRadiusPixels={tuning.heatmapRadius}
					heatmapIntensity={tuning.heatmapIntensity}
					heatmapThreshold={tuning.heatmapThreshold}
					heatmapDebounceMs={tuning.heatmapDebounce}
					heatmapTextureSize={tuning.heatmapTextureSize}
					circleMin={tuning.circleMin}
					circleMax={tuning.circleMax}
				/>
			{/await}
		{/if}
	</MapLibre>
</div>

<!-- <div class="mt-4 flex gap-6 text-xs text-mid-grey px-4">
	<div class="flex items-center gap-2">
		<div
			class="w-3 h-3 rounded-full border-2"
			style="border-color: #52A972; background: white;"
		></div>
		<span>Operating</span>
	</div>
	<div class="flex items-center gap-2">
		<div
			class="w-3 h-3 rounded-full border-2"
			style="border-color: #577CFF; background: white;"
		></div>
		<span>Committed</span>
	</div>
	<div class="flex items-center gap-2">
		<div
			class="w-3 h-3 rounded-full border-2"
			style="border-color: #6A6A6A; background: white;"
		></div>
		<span>Retired</span>
	</div>
	<div class="ml-auto text-xs">
		<span class="font-medium">{facilities.length}</span> facilities with location data
	</div>
</div> -->

<style>
	:global(.maplibregl-popup-content) {
		background: transparent !important;
		padding: 0 !important;
		box-shadow: none !important;
		border-radius: 0 !important;
		font-family: inherit !important;
	}

	:global(.maplibregl-popup-content .font-mono) {
		font-family: 'DM Mono', monospace !important;
	}

	:global(.maplibregl-popup-tip) {
		border-top-color: black !important;
	}

	:global(.maplibregl-popup-close-button) {
		display: none !important;
	}

	/* Attribution control: top-left on mobile, bottom-right on desktop */
	@media (max-width: 767px) {
		:global(.maplibregl-ctrl-bottom-right) {
			top: 0 !important;
			bottom: auto !important;
			left: 0 !important;
			right: auto !important;
		}
	}

	/* Style the attribution button */
	:global(.maplibregl-ctrl-attrib-button) {
		background-color: rgba(255, 255, 255, 0.9) !important;
		border-radius: 4px !important;
	}

	/* Style the attribution inner text when expanded */
	:global(.maplibregl-ctrl-attrib[open] .maplibregl-ctrl-attrib-inner) {
		background-color: rgba(255, 255, 255, 0.95);
		padding: 4px 8px;
		border-radius: 4px;
	}
</style>
