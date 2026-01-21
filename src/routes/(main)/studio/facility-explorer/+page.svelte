<script>
	/**
	 * Facility Explorer
	 *
	 * Displays power generation data for a selected facility
	 * with unit-level breakdown by fuel technology.
	 */

	import { goto } from '$app/navigation';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { fuelTechNameMap, isLoad } from '$lib/fuel_techs';
	import { FacilityPowerChart, buildUnitColourMap } from '$lib/components/charts/facility';

	/**
	 * Get color for a fuel tech code
	 * @param {string} ftCode
	 * @returns {string}
	 */
	function getFuelTechColor(ftCode) {
		return fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (ftCode)] || '#888888';
	}

	/**
	 * @typedef {Object} Props
	 * @property {{ facilities: Array<{code: string, name: string, network_id: string, network_region: string}>, selectedCode: string|null, facility: any, powerData: any, timeZone: string, dateStart: string|null, dateEnd: string|null, error: string|null }} data
	 */

	/** @type {Props} */
	let { data } = $props();

	// ============================================
	// State
	// ============================================

	let searchQuery = $state('');

	// Date range state - initialize from URL params or default to last 3 days
	let dateStartInput = $state(data.dateStart || getDefaultDateStart());
	let dateEndInput = $state(data.dateEnd || getDefaultDateEnd());

	/**
	 * Get default start date (3 days ago)
	 * @returns {string}
	 */
	function getDefaultDateStart() {
		const date = new Date();
		date.setDate(date.getDate() - 3);
		return date.toISOString().slice(0, 10);
	}

	/**
	 * Get default end date (today)
	 * @returns {string}
	 */
	function getDefaultDateEnd() {
		return new Date().toISOString().slice(0, 10);
	}

	// ============================================
	// Derived: Facility Selection
	// ============================================

	let filteredFacilities = $derived(
		data.facilities.filter(
			(f) =>
				f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				f.code.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	let selectedFacility = $derived(data.facility);
	let timeZone = $derived(data.timeZone);

	// ============================================
	// Derived: Unit Analysis (for info panel and table)
	// ============================================

	/**
	 * Build colour map for units with shading for same fuel tech
	 */
	let unitColours = $derived.by(() => {
		if (!selectedFacility?.units) return {};
		return buildUnitColourMap(selectedFacility.units, getFuelTechColor);
	});

	/**
	 * Identify which units are loads
	 */
	let loadUnits = $derived.by(() => {
		if (!selectedFacility?.units) return [];

		return selectedFacility.units
			.filter(
				(/** @type {any} */ unit) => isLoad(unit.fueltech_id) || unit.dispatch_type === 'LOAD'
			)
			.map((/** @type {any} */ unit) => ({
				code: unit.code,
				fueltech_id: unit.fueltech_id,
				name: fuelTechNameMap[unit.fueltech_id] || unit.fueltech_id
			}));
	});

	let hasLoads = $derived(loadUnits.length > 0);

	// ============================================
	// Event Handlers
	// ============================================

	/**
	 * Build URL with current params
	 * @param {Record<string, string | null>} overrides
	 * @returns {string}
	 */
	function buildUrl(overrides = {}) {
		const params = new URLSearchParams();
		const facility = overrides.facility ?? data.selectedCode;
		const dateStart = overrides.date_start ?? dateStartInput;
		const dateEnd = overrides.date_end ?? dateEndInput;

		if (facility) params.set('facility', facility);
		if (dateStart) params.set('date_start', dateStart);
		if (dateEnd) params.set('date_end', dateEnd);

		return `?${params.toString()}`;
	}

	/**
	 * Handle facility selection from search
	 * @param {string} code
	 */
	function handleFacilitySelect(code) {
		goto(buildUrl({ facility: code }));
	}

	/**
	 * Handle date range change
	 */
	function handleDateRangeChange() {
		if (data.selectedCode) {
			goto(buildUrl({}));
		}
	}

	// ============================================
	// Computed UI Values
	// ============================================

	let totalCapacity = $derived(
		selectedFacility?.units?.reduce(
			(/** @type {number} */ sum, /** @type {any} */ u) => sum + (u.capacity_registered || 0),
			0
		) || 0
	);

	let unitCount = $derived(selectedFacility?.units?.length || 0);
</script>

<svelte:head>
	<title>Facility Explorer</title>
</svelte:head>

<div class="p-4 max-w-7xl mx-auto">
	<header class="mb-6">
		<h1 class="text-2xl font-bold">Facility Explorer</h1>
		<p class="text-sm text-mid-warm-grey">
			Explore power generation data for Australian electricity facilities
		</p>
	</header>

	<!-- Facility Selector -->
	<div class="mb-6 max-w-md">
		<label for="facility-search" class="block text-sm font-medium mb-2">Select Facility</label>
		<input
			id="facility-search"
			type="text"
			list="facilities-list"
			placeholder="Search by name or code..."
			class="w-full px-4 py-3 border border-warm-grey rounded-lg focus:border-dark-grey focus:outline-none"
			bind:value={searchQuery}
			onchange={(e) => {
				const target = /** @type {HTMLInputElement} */ (e.target);
				const value = target.value;
				const match = data.facilities.find((f) => f.name === value || f.code === value);
				if (match) handleFacilitySelect(match.code);
			}}
		/>
		<datalist id="facilities-list">
			{#each filteredFacilities.slice(0, 50) as facility (facility.code)}
				<option value={facility.name}>{facility.code}</option>
			{/each}
		</datalist>
	</div>

	{#if data.error}
		<div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
			<p class="text-red-700">{data.error}</p>
		</div>
	{/if}

	{#if selectedFacility}
		<!-- Facility Info Panel -->
		<div class="bg-light-warm-grey rounded-lg p-4 mb-6">
			<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
				<div>
					<h2 class="text-lg font-semibold">{selectedFacility.name}</h2>
					<p class="text-sm text-mid-grey">Code: {selectedFacility.code}</p>
				</div>
				<div>
					<p class="text-sm text-mid-grey">Region</p>
					<p class="font-medium">
						{selectedFacility.network_region} ({selectedFacility.network_id})
					</p>
				</div>
				<div>
					<p class="text-sm text-mid-grey">Total Capacity</p>
					<p class="font-medium font-mono">{totalCapacity.toLocaleString()} MW</p>
				</div>
				<div>
					<p class="text-sm text-mid-grey">Units</p>
					<p class="font-medium">{unitCount}</p>
				</div>
			</div>

			{#if hasLoads}
				<div class="mt-4 pt-4 border-t border-warm-grey">
					<p class="text-sm text-mid-grey mb-2">Load Units (shown as negative):</p>
					<div class="flex flex-wrap gap-2">
						{#each loadUnits as unit (unit.code)}
							<span
								class="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
								style="background-color: {unitColours[unit.code]}20; color: {unitColours[
									unit.code
								]}"
							>
								<span
									class="w-2 h-2 rounded-full"
									style="background-color: {unitColours[unit.code]}"
								></span>
								{unit.code} - {unit.name}
							</span>
						{/each}
					</div>
				</div>
			{/if}
		</div>

		<!-- Date Range Picker -->
		<div class="flex items-center gap-2 mb-4">
			<label for="date-start" class="text-sm text-mid-grey">From:</label>
			<input
				id="date-start"
				type="date"
				class="px-2 py-1 text-sm border border-warm-grey rounded focus:border-dark-grey focus:outline-none"
				bind:value={dateStartInput}
				onchange={handleDateRangeChange}
			/>
			<label for="date-end" class="text-sm text-mid-grey">To:</label>
			<input
				id="date-end"
				type="date"
				class="px-2 py-1 text-sm border border-warm-grey rounded focus:border-dark-grey focus:outline-none"
				bind:value={dateEndInput}
				onchange={handleDateRangeChange}
			/>
		</div>

		<!-- Power Chart Component -->
		<FacilityPowerChart facility={selectedFacility} powerData={data.powerData} {timeZone} />

		<!-- Units Table -->
		{#if selectedFacility.units?.length}
			<div class="mt-6">
				<h3 class="text-lg font-semibold mb-3">Units</h3>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-warm-grey">
								<th class="text-left py-2 px-3">Code</th>
								<th class="text-left py-2 px-3">Fuel Tech</th>
								<th class="text-left py-2 px-3">Type</th>
								<th class="text-right py-2 px-3">Capacity (MW)</th>
								<th class="text-left py-2 px-3">Status</th>
							</tr>
						</thead>
						<tbody>
							{#each selectedFacility.units as unit (unit.code)}
								<tr class="border-b border-light-warm-grey hover:bg-light-warm-grey">
									<td class="py-2 px-3 font-mono">{unit.code}</td>
									<td class="py-2 px-3">
										<span class="flex items-center gap-2">
											<span
												class="w-3 h-3 rounded-full"
												style="background-color: {unitColours[unit.code]}"
											></span>
											{fuelTechNameMap[unit.fueltech_id] || unit.fueltech_id}
										</span>
									</td>
									<td class="py-2 px-3">
										{unit.dispatch_type === 'LOAD' ? 'Load' : 'Generator'}
									</td>
									<td class="py-2 px-3 text-right font-mono">
										{unit.capacity_registered?.toLocaleString() || '-'}
									</td>
									<td class="py-2 px-3 capitalize">{unit.status_id}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{:else}
		<!-- Empty State -->
		<div class="text-center py-12 text-mid-grey">
			<p>Select a facility to view its power generation data.</p>
		</div>
	{/if}
</div>
