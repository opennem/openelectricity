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
		FacilityChart,
		FacilityDataTable,
		FacilityUnitsTable,
		buildUnitColourMap
	} from '$lib/components/charts/facility';
	import { getRegionLabel } from '../../facilities/_utils/filters';
	import { groupUnits, getExploreUrl } from '../../facilities/_utils/units';
	import formatValue from '../../facilities/_utils/format-value';
	import FuelTechBadge from '../../facilities/_components/FuelTechBadge.svelte';
	import { MapPin, AlertCircle, SearchX, ChevronDown, ExternalLink } from '@lucide/svelte';
	import { DateRangePicker } from '$lib/components/ui/date-range-picker';
	import { Accordion } from 'bits-ui';

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

	let dateStart = $state(data.dateStart || getDefaultDateStart());
	let dateEnd = $state(data.dateEnd || getDefaultDateEnd());

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

	/** @type {import('$lib/components/charts/facility/FacilityChart.svelte').default | undefined} */
	let chartComponent = $state(undefined);

	/**
	 * Handle date range change from DateRangePicker — update viewport client-side
	 * @param {{ start: string, end: string }} range
	 */
	function handleDateRangeChange(range) {
		if (data.selectedCode && chartComponent) {
			const startMs = new Date(range.start).getTime();
			const endMs = new Date(range.end + 'T23:59:59').getTime();
			chartComponent.setViewport(startMs, endMs);
		}
	}

	/**
	 * Handle viewport change from chart pan — sync DateRangePicker display
	 * @param {{ start: number, end: number }} range
	 */
	function handleViewportChange(range) {
		dateStart = new Date(range.start).toISOString().slice(0, 10);
		dateEnd = new Date(range.end).toISOString().slice(0, 10);
	}

	/** @type {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string> } | null} */
	let tableData = $state(null);

	/**
	 * @param {{ data: any[], seriesNames: string[], seriesLabels: Record<string, string> }} d
	 */
	function handleVisibleData(d) {
		tableData = d;
	}

	// ============================================
	// Computed UI Values
	// ============================================

	let totalCapacity = $derived(unitGroups.reduce((/** @type {number} */ sum, /** @type {any} */ g) => sum + g.totalCapacity, 0));
	let unitCount = $derived(selectedFacility?.units?.length ?? 0);
	let explorePath = $derived(getExploreUrl(selectedFacility));

	/**
	 * Capacity-weighted average emissions intensity in kgCO₂/MWh
	 * Only includes generator units with emissions data
	 */
	let weightedEmissionsIntensity = $derived.by(() => {
		if (!selectedFacility?.units) return null;
		let totalWeighted = 0;
		let totalCap = 0;
		for (const unit of selectedFacility.units) {
			const ef = Number(unit.emissions_factor_co2);
			const cap = Number(unit.capacity_maximum || unit.capacity_registered);
			if (ef && cap && !isNaN(ef) && !isNaN(cap) && unit.dispatch_type !== 'LOAD') {
				totalWeighted += ef * cap;
				totalCap += cap;
			}
		}
		if (totalCap === 0) return null;
		const result = (totalWeighted / totalCap) * 1000;
		return isNaN(result) ? null : result;
	});

	/** @type {string[]} */
	let accordionValue = $state(['data']);
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

	{#if data.error && !selectedFacility}
		<div class="flex flex-col items-center justify-center py-16 text-mid-grey">
			<AlertCircle size={32} class="mb-3 text-warm-grey" />
			<p class="text-sm font-medium text-dark-grey mb-1">Unable to load facility</p>
			<p class="text-xs">{data.error}</p>
		</div>
	{:else if !data.facilities.length}
		<div class="flex flex-col items-center justify-center py-16 text-mid-grey">
			<AlertCircle size={32} class="mb-3 text-warm-grey" />
			<p class="text-sm font-medium text-dark-grey mb-1">No facilities available</p>
			<p class="text-xs">Could not load the facilities list. Please try again later.</p>
		</div>
	{:else if selectedFacility}
		<h2 class="text-lg font-semibold mb-4">{selectedFacility.name}</h2>

		<Accordion.Root type="multiple" bind:value={accordionValue} class="space-y-3">
			<!-- Info Section (collapsed by default) -->
			<Accordion.Item value="info" class="border border-warm-grey rounded-lg overflow-hidden">
				<Accordion.Header>
					<Accordion.Trigger
						class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-dark-grey hover:bg-light-warm-grey/50 transition-colors group"
					>
						<span>Info</span>
						<ChevronDown
							size={16}
							class="text-mid-grey transition-transform duration-200 group-data-[state=open]:rotate-180"
						/>
					</Accordion.Trigger>
				</Accordion.Header>
				<Accordion.Content class="px-4 pb-4">
					<div class="space-y-3">
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
							{#if weightedEmissionsIntensity}
								<div class="flex items-baseline gap-1">
									<span class="font-mono text-dark-grey">{formatValue(Math.round(weightedEmissionsIntensity))}</span>
									<span class="text-xs text-mid-grey">kgCO₂/MWh</span>
								</div>
							{/if}
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

						<!-- Units Table -->
						{#if selectedFacility.units?.length}
							<div class="border border-warm-grey rounded-lg mt-2">
								<FacilityUnitsTable units={selectedFacility.units} {unitColours} compact detailed />
							</div>
							<p class="text-xxs text-mid-grey mt-2">
								Capacity shown is maximum capacity where available, otherwise registered capacity.
							</p>
						{/if}

						<!-- Explore Link -->
						{#if explorePath}
							<div class="mt-3">
								<a
									href={explorePath}
									target="_blank"
									rel="noopener noreferrer"
									class="inline-flex items-center gap-1.5 text-xs text-mid-grey hover:text-dark-grey transition-colors"
								>
									<ExternalLink size={12} />
									View on OpenElectricity
								</a>
							</div>
						{/if}
					</div>
				</Accordion.Content>
			</Accordion.Item>

			<!-- Data Section (expanded by default) -->
			<Accordion.Item value="data" class="border border-warm-grey rounded-lg overflow-hidden">
				<Accordion.Header>
					<Accordion.Trigger
						class="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-dark-grey hover:bg-light-warm-grey/50 transition-colors group"
					>
						<span>Data</span>
						<ChevronDown
							size={16}
							class="text-mid-grey transition-transform duration-200 group-data-[state=open]:rotate-180"
						/>
					</Accordion.Trigger>
				</Accordion.Header>
				<Accordion.Content class="px-4 pb-4">
					<!-- Date Range Picker -->
					<div class="mb-4">
						<DateRangePicker
							startDate={dateStart}
							endDate={dateEnd}
							onchange={handleDateRangeChange}
						/>
					</div>

					<!-- Power Chart -->
					{#if data.powerData}
						<div class="bg-light-warm-grey/30 rounded-xl p-4">
							<FacilityChart
							bind:this={chartComponent}
							facility={selectedFacility}
							powerData={data.powerData}
							{timeZone}
							onviewportchange={handleViewportChange}
							onvisibledata={handleVisibleData}
						/>
						</div>

					{#if tableData}
						<div class="mt-2 border border-light-warm-grey rounded-lg overflow-y-auto max-h-[300px]">
							<FacilityDataTable
								data={tableData.data}
								seriesNames={tableData.seriesNames}
								seriesLabels={tableData.seriesLabels}
								{timeZone}
							/>
						</div>
					{/if}
				{:else}
						<div class="bg-light-warm-grey/30 rounded-xl p-4 h-[350px] flex flex-col items-center justify-center">
							{#if data.error}
								<AlertCircle size={24} class="mb-2 text-warm-grey" />
								<p class="text-sm text-mid-grey">Failed to load power data</p>
								<p class="text-xs text-warm-grey mt-1">{data.error}</p>
							{:else}
								<p class="text-sm text-mid-grey">No power data available for this facility</p>
							{/if}
						</div>
					{/if}
				</Accordion.Content>
			</Accordion.Item>
		</Accordion.Root>
	{:else}
		<!-- Empty State -->
		<div class="flex flex-col items-center justify-center py-16 text-mid-grey">
			<SearchX size={32} class="mb-3 text-warm-grey" />
			<p class="text-sm">Select a facility to view its power generation data.</p>
		</div>
	{/if}
</div>
