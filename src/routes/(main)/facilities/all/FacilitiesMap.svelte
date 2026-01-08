<script>
	import { MapLibre, Marker, Popup, NavigationControl } from 'svelte-maplibre-gl';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import UnitGroup from './UnitGroup.svelte';
	import { regions } from './page-data-options/filters';

	/**
	 * @type {{
	 *   facilities: any[],
	 *   hoveredFacility?: any | null
	 * }}
	 */
	let { facilities = [], hoveredFacility = null } = $props();

	/**
	 * Get the primary fuel tech for a facility (most common fuel tech among units)
	 * @param {any} facility
	 * @returns {string}
	 */
	function getPrimaryFuelTech(facility) {
		if (!facility.units || facility.units.length === 0) return 'unknown';

		// Count occurrences of each fuel tech
		/** @type {Record<string, number>} */
		const fuelTechCounts = {};
		facility.units.forEach((/** @type {any} */ unit) => {
			const fueltech = unit.fueltech_id;
			if (fueltech) {
				fuelTechCounts[fueltech] = (fuelTechCounts[fueltech] || 0) + 1;
			}
		});

		// Find the most common fuel tech
		let maxCount = 0;
		let primaryFuelTech = 'unknown';
		Object.entries(fuelTechCounts).forEach(([fueltech, count]) => {
			if (count > maxCount) {
				maxCount = count;
				primaryFuelTech = fueltech;
			}
		});

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
	 * Get status color for marker border
	 * @param {any} facility
	 * @returns {string}
	 */
	function getStatusBorderColor(facility) {
		if (!facility.units || facility.units.length === 0) return '#999999';
		const status = facility.units[0]?.status_id;

		switch (status) {
			case 'operating':
				return '#52A972'; // green
			case 'committed':
				return '#577CFF'; // blue
			case 'retired':
				return '#6A6A6A'; // grey
			default:
				return '#999999';
		}
	}

	/**
	 * Group units by fueltech and status for popup display
	 * @param {any} facility
	 * @returns {Array<{fueltech_id: string, status_id: string, isCommissioning: boolean, capacity_maximum: number, capacity_registered: number, max_generation: number, bgColor: string}>}
	 */
	function groupFacilityUnits(facility) {
		if (!facility.units || facility.units.length === 0) return [];

		/** @type {Map<string, any>} */
		const groups = new Map();

		for (const unit of facility.units) {
			const isCommissioning = unit.isCommissioning;
			const key = `${unit.fueltech_id}|||${unit.status_id}`;

			if (!groups.has(key)) {
				groups.set(key, {
					fueltech_id: unit.fueltech_id,
					status_id: unit.status_id,
					isCommissioning,
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

		return Array.from(groups.values());
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

	// Australia center coordinates (default fallback)
	const center = { lng: 110, lat: -28 };

	/** @type {any | null} */
	let selectedFacility = $state(null);
	/** @type {any | null} */
	let mapInstance = $state(null);

	// Validate hoveredFacility - must exist in facilities list or have valid location
	let validatedHoveredFacility = $derived.by(() => {
		if (!hoveredFacility) return null;

		// Check if it has a valid location
		const hasValidLocation =
			hoveredFacility.location &&
			typeof hoveredFacility.location.lat === 'number' &&
			typeof hoveredFacility.location.lng === 'number' &&
			!isNaN(hoveredFacility.location.lat) &&
			!isNaN(hoveredFacility.location.lng);

		if (!hasValidLocation) return null;

		// Check if it exists in the facilities list
		const existsInFacilities = facilities.some((f) => f.code === hoveredFacility.code);

		return existsInFacilities ? hoveredFacility : null;
	});

	// Show popup for hovered or clicked facility
	let popupFacility = $derived(validatedHoveredFacility || selectedFacility);

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

		// Calculate bounding box
		let minLng = Infinity;
		let maxLng = -Infinity;
		let minLat = Infinity;
		let maxLat = -Infinity;

		validFacilities.forEach((facility) => {
			const { lng, lat } = facility.location;
			minLng = Math.min(minLng, lng);
			maxLng = Math.max(maxLng, lng);
			minLat = Math.min(minLat, lat);
			maxLat = Math.max(maxLat, lat);
		});

		// Add padding
		const padding = 0.1;
		const lngPadding = (maxLng - minLng) * padding;
		const latPadding = (maxLat - minLat) * padding;

		// Fit bounds with asymmetric padding to account for the list panel on the left
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
	 * Handle map load event
	 */
	function handleMapLoad() {
		if (facilities.length > 0) {
			setTimeout(() => {
				fitMapToFacilities(facilities);
			}, 100);
		}
	}

	// Fit bounds when facilities change
	$effect(() => {
		if (mapInstance && facilities.length > 0) {
			// Use a small timeout to ensure map is fully loaded
			setTimeout(() => {
				fitMapToFacilities(facilities);
			}, 100);
		}
	});
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
		bind:map={mapInstance}
		onload={handleMapLoad}
	>
		<NavigationControl position="top-right" showCompass={false} />
		{#each facilities as facility}
			{@const color = getFacilityColor(facility)}
			{@const borderColor = getFacilityColor(facility)}
			{@const isHovered = validatedHoveredFacility?.code === facility.code}
			<Marker lnglat={[facility.location.lng, facility.location.lat]}>
				{#snippet content()}
					<button
						class="rounded-full cursor-pointer transition-all duration-200 border-0.5"
						class:w-3={!isHovered}
						class:h-3={!isHovered}
						class:w-5={isHovered}
						class:h-5={isHovered}
						class:scale-150={isHovered}
						class:z-50={isHovered}
						class:ring-2={isHovered}
						class:ring-white={isHovered}
						class:shadow-lg={isHovered}
						style="background-color: {color}{isHovered ? '' : 'cc'}; border-color: {borderColor};"
						onclick={() => (selectedFacility = facility)}
						aria-label="View {facility.name} details"
					></button>
				{/snippet}
			</Marker>
		{/each}

		{#if popupFacility}
			<Popup
				lnglat={[popupFacility.location.lng, popupFacility.location.lat]}
				offset={[0, -15]}
				closeOnClick={true}
				onclose={() => (selectedFacility = null)}
			>
				<div class="bg-black rounded-lg px-4 py-3 shadow-lg text-white min-w-[240px]">
					<div class="font-semibold text-sm">{popupFacility.name}</div>
					<div class="text-xs text-white/60 mb-3 border-b border-white/20 pb-3">
						{getRegionLabel(popupFacility.network_id, popupFacility.network_region)}
					</div>

					{#if popupFacility.units && popupFacility.units.length > 0}
						<div
							class="flex flex-col divide-y divide-white/20 [&>*]:py-2 [&>*:first-child]:pt-0 [&>*:last-child]:pb-0"
						>
							{#each groupFacilityUnits(popupFacility) as group}
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
		display: none !important;
	}

	:global(.maplibregl-popup-close-button) {
		color: white !important;
		font-size: 18px !important;
		padding: 4px 8px !important;
		right: 4px !important;
		top: 4px !important;
	}

	:global(.maplibregl-popup-close-button:hover) {
		background: rgba(255, 255, 255, 0.1) !important;
		border-radius: 4px;
	}
</style>
