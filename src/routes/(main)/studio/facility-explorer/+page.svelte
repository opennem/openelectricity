<script>
	/**
	 * Facility Explorer
	 *
	 * Displays power generation data for a selected facility
	 * with unit-level breakdown by fuel technology.
	 */

	import { goto } from '$app/navigation';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import {
		FacilityPowerChart,
		FacilityUnitsTable,
		buildUnitColourMap
	} from '$lib/components/charts/facility';
	import { getRegionLabel } from '../../facilities/_utils/filters';
	import { groupUnits } from '../../facilities/_utils/units';
	import formatValue from '../../facilities/_utils/format-value';
	import FuelTechBadge from '../../facilities/_components/FuelTechBadge.svelte';
	import { MapPin } from '@lucide/svelte';
	import { DateRangePicker } from '$lib/components/ui/date-range-picker';

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

	let dateStart = $derived(data.dateStart || getDefaultDateStart());
	let dateEnd = $derived(data.dateEnd || getDefaultDateEnd());

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

	// Facility info derived values (matching FacilityDetailPanel)
	let regionLabel = $derived(
		selectedFacility ? getRegionLabel(selectedFacility.network_id, selectedFacility.network_region) : ''
	);
	let unitGroups = $derived(selectedFacility ? groupUnits(selectedFacility) : []);

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
		const ds = overrides.date_start ?? dateStart;
		const de = overrides.date_end ?? dateEnd;

		if (facility) params.set('facility', facility);
		if (ds) params.set('date_start', ds);
		if (de) params.set('date_end', de);

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
	 * Handle date range change from DateRangePicker
	 * @param {{ start: string, end: string }} range
	 */
	function handleDateRangeChange(range) {
		if (data.selectedCode) {
			goto(buildUrl({ date_start: range.start, date_end: range.end }));
		}
	}

	// ============================================
	// Computed UI Values
	// ============================================

	let totalCapacity = $derived(unitGroups.reduce((/** @type {number} */ sum, /** @type {any} */ g) => sum + g.totalCapacity, 0));
	let unitCount = $derived(selectedFacility?.units?.length ?? 0);
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
		<!-- Facility Info -->
		<div class="mb-6 space-y-3">
			<h2 class="text-lg font-semibold">{selectedFacility.name}</h2>

			<!-- Region, Network, Code -->
			<div class="flex items-center gap-2 flex-wrap">
				<span
					class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-light-warm-grey text-dark-grey"
				>
					{regionLabel}
				</span>
				<span
					class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-light-warm-grey text-mid-grey"
				>
					{selectedFacility.network_id}
				</span>
				<span class="text-xs text-mid-grey font-mono">{selectedFacility.code}</span>
			</div>

			<!-- Capacity & Units summary -->
			<div class="flex items-center gap-4">
				<div class="flex items-baseline gap-1">
					<span class="font-mono text-lg text-dark-grey">{formatValue(totalCapacity)}</span>
					<span class="text-xs text-mid-grey">MW</span>
				</div>
				<span class="text-xs text-mid-grey">
					{unitCount} unit{unitCount !== 1 ? 's' : ''}
				</span>
			</div>

			<!-- Fuel tech badges -->
			{#if unitGroups.length}
				<div class="flex items-center gap-1.5 flex-wrap">
					{#each unitGroups as group (`${group.fueltech_id}-${group.status_id}`)}
						<div class="flex items-center gap-1">
							<FuelTechBadge
								fueltech_id={group.fueltech_id}
								status_id={group.status_id}
								isCommissioning={group.isCommissioning}
								size="sm"
							/>
							<span class="text-xs text-mid-grey">
								{formatValue(group.totalCapacity)} MW
							</span>
						</div>
					{/each}
				</div>
			{/if}

			<!-- Location -->
			{#if selectedFacility.location?.lat && selectedFacility.location?.lng}
				<div class="flex items-center gap-1 text-xs text-mid-grey">
					<MapPin size={12} />
					<span>{selectedFacility.location.lat.toFixed(4)}, {selectedFacility.location.lng.toFixed(4)}</span>
				</div>
			{/if}

			<!-- Description -->
			{#if selectedFacility.description}
				<p class="text-sm text-mid-grey">{selectedFacility.description}</p>
			{/if}
		</div>

		<!-- Date Range Picker -->
		<div class="mb-4">
			<DateRangePicker
				startDate={dateStart}
				endDate={dateEnd}
				onchange={handleDateRangeChange}
			/>
		</div>

		<!-- Power Chart -->
		<div class="bg-light-warm-grey/30 rounded-xl p-4 mb-4">
			<FacilityPowerChart facility={selectedFacility} powerData={data.powerData} {timeZone} />
		</div>

		<!-- Units Table -->
		{#if selectedFacility.units?.length}
			<div class="border border-warm-grey rounded-lg">
				<FacilityUnitsTable units={selectedFacility.units} {unitColours} compact />
			</div>
			<p class="text-xxs text-mid-grey mt-3">
				Capacity shown is maximum capacity where available, otherwise registered capacity.
			</p>
		{/if}
	{:else}
		<!-- Empty State -->
		<div class="text-center py-12 text-mid-grey">
			<p>Select a facility to view its power generation data.</p>
		</div>
	{/if}
</div>
