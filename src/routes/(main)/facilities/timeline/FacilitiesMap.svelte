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

	// Australia center coordinates (offset to left half of viewport)
	const center = { lng: 110, lat: -28 };

	/** @type {any | null} */
	let selectedFacility = $state(null);
</script>

<div class="w-full h-[calc(100vh-118px)] overflow-hidden">
	<MapLibre
		style="/map-styles/positron.json"
		class="w-full h-full"
		{center}
		zoom={3.5}
		maxZoom={18}
		minZoom={3}
		scrollZoom={false}
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
