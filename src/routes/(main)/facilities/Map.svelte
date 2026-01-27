<script>
	import {
		MapLibre,
		Popup,
		NavigationControl,
		AttributionControl,
		GeoJSONSource,
		CircleLayer,
		SymbolLayer,
		LineLayer
	} from 'svelte-maplibre-gl';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import UnitGroup from './_components/UnitGroup.svelte';
	import FacilityCard from './_components/FacilityCard.svelte';
	import { getRegionLabel } from './_utils/filters';
	import { X } from '@lucide/svelte';

	/**
	 * @type {{
	 *   facilities: any[],
	 *   hoveredFacility?: any | null,
	 *   selectedFacilityCode?: string | null,
	 *   clustering?: boolean,
	 *   satelliteView?: boolean,
	 *   showTransmissionLines?: boolean,
	 *   scrollZoom?: boolean,
	 *   flyToOffsetX?: number,
	 *   flyToOffsetY?: number,
	 *   onhover?: (facility: any | null) => void,
	 *   onclick?: (facility: any | null) => void,
	 *   onselect?: (facility: any | null) => void
	 * }}
	 */
	let {
		facilities = [],
		hoveredFacility = null,
		selectedFacilityCode = null,
		clustering = false,
		satelliteView = false,
		showTransmissionLines = true,
		scrollZoom = false,
		flyToOffsetX = 0.25,
		flyToOffsetY = -0.3,
		onhover,
		onclick,
		onselect
	} = $props();

	// Australia center coordinates (default fallback)
	const center = { lng: 110, lat: -28 };

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

	// Map style (positron or satellite)
	let mapStyle = $derived(
		satelliteView ? '/map-styles/satellite.json' : '/map-styles/positron.json'
	);

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
						max_generation: 0,
						bgColor: fuelTechColourMap[unit.fueltech_id] || '#6A6A6A'
					});
				}

				const group = groups.get(key);
				group.capacity_maximum += Number(unit.capacity_maximum) || 0;
				group.capacity_registered += Number(unit.capacity_registered) || 0;
				group.max_generation += Number(unit.max_generation) || 0;
			}

			cache.set(facility.code, Array.from(groups.values()));
		}

		return cache;
	});

	// Convert facilities to GeoJSON for clustering
	let facilitiesGeoJSON = $derived.by(() => {
		/** @type {GeoJSON.FeatureCollection} */
		const geojson = {
			type: 'FeatureCollection',
			features: facilities.map((facility) => ({
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
					capacity: getTotalCapacity(facility)
				}
			}))
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
					padding: {
						top: 50,
						bottom: 50,
						left: window.innerWidth > 768 ? window.innerWidth * 0.5 : 50,
						right: 50
					},
					maxZoom: 10,
					duration: RESET_DURATION
				}
			);
		} catch (error) {
			console.error('Error fitting bounds:', error);
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
	 * Compact attribution control
	 */
	function compactAttribution() {
		const attrib = document.querySelector('.maplibregl-ctrl-attrib');
		if (attrib) {
			attrib.classList.add('maplibregl-compact');
			attrib.classList.remove('maplibregl-compact-show');
			attrib.removeAttribute('open');
		}
	}

	/**
	 * Handle map load event - use idle event instead of setTimeout
	 */
	function handleMapLoad() {
		mapLoaded = true;

		// Only fit to all facilities if no specific facility is selected
		if (facilities.length > 0 && !selectedFacilityCode) {
			// Use idle event instead of setTimeout for reliable timing
			mapInstance.once('idle', () => {
				fitMapToFacilities(facilities);
			});
		}

		// Use idle event for attribution compacting
		mapInstance.once('idle', compactAttribution);

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
		if (mapInstance && mapLoaded && facilities.length > 0 && !selectedFacilityCode) {
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
		// Also account for left panel on desktop
		const yOffset = -120; // Shift view up to show popup above the point

		if (window.innerWidth > 768) {
			// Desktop: also shift right for left panel
			return [window.innerWidth * 0.2, yOffset];
		}
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

		// Check if click was on a facility point or cluster
		const layersToCheck = clustering
			? ['facility-points-unclustered', 'cluster-circles']
			: ['facility-points'];
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
		} catch (error) {
			console.error('Error getting cluster leaves:', error);
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
		touchZoomRotate={true}
		attributionControl={false}
		fadeDuration={0}
		bind:map={mapInstance}
		onload={handleMapLoad}
		onclick={handleMapClick}
	>
		<NavigationControl position="top-right" showCompass={false} />
		<AttributionControl position="bottom-right" compact={true} />

		<!-- Transmission lines layer -->
		{#if showTransmissionLines}
			<GeoJSONSource id="transmission-lines" data="/data/Electricity_Transmission_Lines.geojson">
				<LineLayer
					id="transmission-lines-layer"
					filter={['==', ['get', 'operationalstatus'], 'Operational']}
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
								['>=', ['get', 'capacitykv'], 400], 1.5,
								['>=', ['get', 'capacitykv'], 220], 1,
								['>=', ['get', 'capacitykv'], 110], 0.7,
								0.5
							],
							8,
							[
								'case',
								['>=', ['get', 'capacitykv'], 400], 4,
								['>=', ['get', 'capacitykv'], 220], 3,
								['>=', ['get', 'capacitykv'], 110], 2,
								1.5
							],
							14,
							[
								'case',
								['>=', ['get', 'capacitykv'], 400], 6,
								['>=', ['get', 'capacitykv'], 220], 5,
								['>=', ['get', 'capacitykv'], 110], 4,
								3
							]
						],
						'line-opacity': [
							'interpolate',
							['linear'],
							['zoom'],
							3,
							0.5,
							8,
							0.7,
							12,
							0.85
						]
					}}
					layout={{
						'line-cap': 'round',
						'line-join': 'round'
					}}
				/>
			</GeoJSONSource>
		{/if}

		{#if clustering}
			<!-- Clustered GeoJSON source -->
			<GeoJSONSource
				id="facilities-clustered"
				data={facilitiesGeoJSON}
				cluster={true}
				clusterMaxZoom={14}
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
							[
								'interpolate',
								['linear'],
								['sqrt', ['get', 'capacity']],
								0,
								6,
								10,
								10,
								20,
								14,
								30,
								18,
								45,
								24,
								60,
								30
							],
							[
								'interpolate',
								['linear'],
								['sqrt', ['get', 'capacity']],
								0,
								4,
								10,
								8,
								20,
								12,
								30,
								16,
								45,
								22,
								60,
								28
							]
						],
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
							[
								'interpolate',
								['linear'],
								['sqrt', ['get', 'capacity']],
								0,
								6,
								10,
								10,
								20,
								14,
								30,
								18,
								45,
								24,
								60,
								30
							],
							[
								'interpolate',
								['linear'],
								['sqrt', ['get', 'capacity']],
								0,
								4,
								10,
								8,
								20,
								12,
								30,
								16,
								45,
								22,
								60,
								28
							]
						],
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

		<!-- Popup for hovered facility - uses lazy computed content -->
		{#if popupContent}
			<Popup
				lnglat={[popupContent.location.lng, popupContent.location.lat]}
				offset={[0, -15]}
				closeOnClick={false}
				anchor="bottom"
			>
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
