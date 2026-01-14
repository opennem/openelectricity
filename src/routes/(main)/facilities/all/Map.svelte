<script>
	import {
		MapLibre,
		Popup,
		NavigationControl,
		AttributionControl,
		GeoJSONSource,
		CircleLayer
	} from 'svelte-maplibre-gl';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import UnitGroup from '../_components/UnitGroup.svelte';
	import { regions } from '../_utils/filters';

	/**
	 * @type {{
	 *   facilities: any[],
	 *   hoveredFacility?: any | null,
	 *   onhover?: (facility: any | null) => void,
	 *   onclick?: (facility: any | null) => void
	 * }}
	 */
	let { facilities = [], hoveredFacility = null, onhover, onclick } = $props();

	// Australia center coordinates (default fallback)
	const center = { lng: 110, lat: -28 };

	/** @type {any | null} */
	let mapInstance = $state(null);
	/** @type {string | null} */
	let mapHoveredFacilityCode = $state(null);
	let mapLoaded = $state(false);
	let isDragging = $state(false);

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

	/**
	 * Get the region label (state name)
	 * @param {string} network_id
	 * @param {string} network_region
	 * @returns {string}
	 */
	function getRegionLabel(network_id, network_region) {
		if (network_region) {
			return regions.find((r) => r.value === network_region.toLowerCase())?.label || network_region;
		}
		return network_id?.toUpperCase() || '';
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
					maxZoom: 10
				}
			);
		} catch (error) {
			console.error('Error fitting bounds:', error);
		}
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

		if (facilities.length > 0) {
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
	}

	// Fit bounds when facilities change - use idle event
	$effect(() => {
		if (mapInstance && mapLoaded && facilities.length > 0) {
			mapInstance.once('idle', () => {
				fitMapToFacilities(facilities);
			});
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
		}
	}

	/**
	 * Handle click on map (to dismiss popup on mobile)
	 * @param {any} e
	 */
	function handleMapClick(e) {
		// Ignore clicks that happen right after dragging
		if (isDragging) return;

		// Check if click was on a facility point
		const features = mapInstance?.queryRenderedFeatures(e.point, { layers: ['facility-points'] });
		if (!features || features.length === 0) {
			// Clicked on empty space - clear selection
			mapHoveredFacilityCode = null;
			onhover?.(null);
		}
	}
</script>

<div class="w-full h-full overflow-hidden">
	<MapLibre
		style="/map-styles/positron.json"
		class="w-full h-full"
		{center}
		zoom={3.5}
		maxZoom={18}
		minZoom={3}
		scrollZoom={false}
		touchZoomRotate={true}
		attributionControl={false}
		bind:map={mapInstance}
		onload={handleMapLoad}
		onclick={handleMapClick}
	>
		<NavigationControl position="top-right" showCompass={false} />
		<AttributionControl position="bottom-right" compact={true} />

		<!-- GeoJSON source without clustering - WebGL rendering for performance -->
		<GeoJSONSource id="facilities" data={facilitiesGeoJSON}>
			<!-- All facility points rendered on WebGL canvas -->
			<CircleLayer
				id="facility-points"
				paint={{
					'circle-color': ['get', 'color'],
					// Circle radius proportional to sqrt(capacity) so area is proportional to capacity
					// Scale: sqrt(MW) -> radius in pixels
					//   sqrt(0)    = 0  -> 4px   (0 MW)
					//   sqrt(100)  = 10 -> 8px   (100 MW)
					//   sqrt(400)  = 20 -> 12px  (400 MW)
					//   sqrt(900)  = 30 -> 16px  (900 MW)
					//   sqrt(2025) = 45 -> 22px  (2000 MW)
					//   sqrt(3600) = 60 -> 28px  (3600 MW)
					'circle-radius': [
						'case',
						['==', ['get', 'code'], activeHoveredFacilityCode ?? ''],
						// Hovered: +2px larger than default
						[
							'interpolate',
							['linear'],
							['sqrt', ['get', 'capacity']],
							0, 6,
							10, 10,
							20, 14,
							30, 18,
							45, 24,
							60, 30
						],
						// Default size
						[
							'interpolate',
							['linear'],
							['sqrt', ['get', 'capacity']],
							0, 4,
							10, 8,
							20, 12,
							30, 16,
							45, 22,
							60, 28
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
						// Hovered circle is fully opaque
						['==', ['get', 'code'], activeHoveredFacilityCode ?? ''],
						1,
						// Non-hovered circles dim to 0.3 when something is hovered, otherwise 0.8
						activeHoveredFacilityCode ? 0.3 : 0.8
					]
				}}
				layout={{
					// Bring hovered circle to front (higher value = rendered on top)
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
