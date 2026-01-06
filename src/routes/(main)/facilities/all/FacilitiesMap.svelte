<script>
	import { MapLibre, Marker, Popup } from 'svelte-maplibre-gl';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';

	/**
	 * @typedef {Object} Props
	 * @property {any[]} facilities
	 */

	/** @type {Props} */
	let { facilities = [] } = $props();

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

	// Australia center coordinates (default fallback)
	const center = { lng: 110, lat: -28 };

	/** @type {any | null} */
	let selectedFacility = $state(null);
	/** @type {any | null} */
	let mapInstance = $state(null);

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

		// Fit bounds
		try {
			mapInstance.fitBounds(
				[
					[minLng - lngPadding, minLat - latPadding],
					[maxLng + lngPadding, maxLat + latPadding]
				],
				{
					padding: 50,
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
		bind:map={mapInstance}
		onload={handleMapLoad}
	>
		{#each facilities as facility}
			{@const color = getFacilityColor(facility)}
			{@const borderColor = getFacilityColor(facility)}
			<Marker lnglat={[facility.location.lng, facility.location.lat]}>
				{#snippet content()}
					<button
						class="w-3 h-3 rounded-full cursor-pointer transition-transform hover:scale-150 border-0.5"
						style="background-color: {color}cc; border-color: {borderColor};"
						onclick={() => (selectedFacility = facility)}
						aria-label="View {facility.name} details"
					></button>
				{/snippet}
			</Marker>
		{/each}

		{#if selectedFacility}
			<Popup
				lnglat={[selectedFacility.location.lng, selectedFacility.location.lat]}
				closeOnClick={true}
				onclose={() => (selectedFacility = null)}
			>
				<div class="p-2 min-w-[200px]">
					<h3 class="font-semibold text-sm mb-1">{selectedFacility.name}</h3>
					<p class="text-xs text-gray-600 mb-2">
						<!-- {selectedFacility.network_id} -->
						{#if selectedFacility.network_region}
							{selectedFacility.network_region}
						{/if}
					</p>

					{#if selectedFacility.units && selectedFacility.units.length > 0}
						<div class="text-xs">
							<p class="font-medium mb-1">Units: {selectedFacility.units.length}</p>
							<div class="flex flex-wrap gap-1">
								{#each [...new Set(selectedFacility.units.map((/** @type {any} */ u) => u.fueltech_id))] as fueltech}
									{@const ftColor = fuelTechColourMap[fueltech] || '#6A6A6A'}
									<span
										class="inline-block px-2 py-0.5 rounded text-xs"
										style="background-color: {ftColor}; color: white;"
									>
										{fueltech}
									</span>
								{/each}
							</div>
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
