<script>
	/**
	 * Facility Explorer
	 *
	 * Displays power generation data for a selected facility
	 * with unit-level breakdown by fuel technology.
	 */

	import { goto, replaceState } from '$app/navigation';
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
	import RangeSelector from '$lib/components/form-elements/RangeSelector.svelte';
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
	 * @property {{ facilities: Array<{code: string, name: string, network_id: string, network_region: string}>, selectedCode: string|null, facility: any, powerData: any, timeZone: string, dateStart: string|null, dateEnd: string|null, range: number|null, error: string|null }} data
	 */

	/** @type {Props} */
	let { data } = $props();

	// ============================================
	// State
	// ============================================

	let searchQuery = $state('');

	/**
	 * Get default start date based on range
	 * @param {number} days
	 * @returns {string}
	 */
	function getDateStartForRange(days) {
		const date = new Date();
		date.setDate(date.getDate() - days);
		return date.toISOString().slice(0, 10);
	}

	/**
	 * Get default end date (today)
	 * @returns {string}
	 */
	function getDefaultDateEnd() {
		return new Date().toISOString().slice(0, 10);
	}

	let dateStart = $state(data.dateStart || getDateStartForRange(data.range ?? 3));
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
		const range = overrides.range ?? selectedRange;

		if (facility) params.set('facility', facility);
		if (range) {
			params.set('days', String(range));
		} else {
			if (ds) params.set('date_start', ds);
			if (de) params.set('date_end', de);
		}

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

	/** Earliest selectable date: 1 Dec 1998 */
	const MIN_DATE = '1998-12-01';
	/** Latest selectable date: today */
	let maxDate = $derived(new Date().toISOString().slice(0, 10));

	/**
	 * Auto-detect metric and interval from a duration in days.
	 * - Under 2 days → power / 5m
	 * - Under 15 days → power / 5m (chart auto-displays as 30min)
	 * - Under 1 year → energy / 1d
	 * - 1 year or more → energy / 1d (chart auto-displays as monthly)
	 * @param {number} days
	 */
	function autoSetMetricInterval(days) {
		if (days < 15) {
			activeInterval = '5m';
			activeMetric = 'power';
		} else {
			activeInterval = '1d';
			activeMetric = 'energy';
		}
	}

	/**
	 * Handle date range change from DateRangePicker — update viewport client-side.
	 * The picker emits bare date strings like "2025-01-01". We interpret them as
	 * midnight in the network's timezone so ChartDataManager (which adds the network
	 * offset when building API params) produces correct API dates.
	 * @param {{ start: string, end: string }} range
	 */
	function handleDateRangeChange(range) {
		// Validate: start must be before end
		if (range.start >= range.end) return;

		// Validate: at least 1 day apart
		const startParts = range.start.split('-').map(Number);
		const endParts = range.end.split('-').map(Number);
		const startDay = new Date(startParts[0], startParts[1] - 1, startParts[2]);
		const endDay = new Date(endParts[0], endParts[1] - 1, endParts[2]);
		const dayDiff = (endDay.getTime() - startDay.getTime()) / (24 * 60 * 60 * 1000);
		if (dayDiff < 1) return;

		selectedRange = null;

		const tz = timeZone || '+10:00';
		const startMs = new Date(range.start + 'T00:00:00' + tz).getTime();
		const endMs = new Date(range.end + 'T23:59:59' + tz).getTime();
		const days = (endMs - startMs) / (24 * 60 * 60 * 1000);

		autoSetMetricInterval(days);

		if (data.selectedCode && chartComponent) {
			chartComponent.setViewport(startMs, endMs);
		}

		// Update URL with date range (no range preset)
		replaceState(buildUrl({ range: null }), {});
	}

	/** @type {ReturnType<typeof setTimeout> | null} */
	let metricSwitchTimer = null;

	/**
	 * Handle viewport change from chart pan/zoom — sync DateRangePicker display
	 * and auto-switch metric when crossing thresholds.
	 * Convert UTC ms to a date string in the network's timezone.
	 * @param {{ start: number, end: number }} range
	 */
	function handleViewportChange(range) {
		selectedRange = null;
		const offsetMs = timeZone === '+08:00' ? 8 * 3600_000 : 10 * 3600_000;
		dateStart = new Date(range.start + offsetMs).toISOString().slice(0, 10);
		dateEnd = new Date(range.end + offsetMs).toISOString().slice(0, 10);

		// Auto-switch metric/interval based on viewport duration (with hysteresis)
		const durationDays = (range.end - range.start) / (24 * 60 * 60 * 1000);
		let targetMetric = activeMetric;
		let targetInterval = activeInterval;

		if (activeMetric === 'power' && durationDays >= 15) {
			targetMetric = 'energy';
			targetInterval = '1d';
		} else if (activeMetric === 'energy' && durationDays <= 13) {
			targetMetric = 'power';
			targetInterval = '5m';
		}

		if (targetMetric !== activeMetric || targetInterval !== activeInterval) {
			// Debounce the switch so continuous zoom gestures don't cause rapid flipping
			if (metricSwitchTimer) clearTimeout(metricSwitchTimer);
			metricSwitchTimer = setTimeout(() => {
				activeMetric = targetMetric;
				activeInterval = targetInterval;
			}, 300);
		}
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

	/** @type {number | null} */
	let selectedRange = $state(data.range ?? 3);

	/** Active interval/metric — derived from initial range */
	/** @type {string} */
	let activeInterval = $state((data.range ?? 3) >= 15 ? '1d' : '5m');
	/** @type {string} */
	let activeMetric = $state((data.range ?? 3) >= 15 ? 'energy' : 'power');

	/** Display interval — set by FacilityChart toggle (power: '5m'/'30m', energy: '1d'/'1M') */
	/** @type {string} */
	let displayInterval = $state('30m');

	/**
	 * Handle quick range selection (3d/7d/30d/1y)
	 * @param {number} days
	 */
	function handleRangeSelect(days) {
		autoSetMetricInterval(days);

		const tz = timeZone || '+10:00';
		const now = new Date();
		const start = new Date();
		start.setDate(now.getDate() - days);
		dateStart = start.toISOString().slice(0, 10);
		dateEnd = now.toISOString().slice(0, 10);
		if (chartComponent) {
			const startMs = new Date(dateStart + 'T00:00:00' + tz).getTime();
			const endMs = new Date(dateEnd + 'T23:59:59' + tz).getTime();
			chartComponent.setViewport(startMs, endMs);
		}

		// Update URL without navigation
		replaceState(buildUrl({ range: String(days) }), {});
	}

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
					<div class="flex items-center gap-2 mb-4">
						<RangeSelector
							options={[
								{ label: '3d', value: 3 },
								{ label: '7d', value: 7 },
								{ label: '30d', value: 30 },
								{ label: '1y', value: 365 }
							]}
							bind:selected={selectedRange}
							onchange={handleRangeSelect}
						/>
						<DateRangePicker
							startDate={dateStart}
							endDate={dateEnd}
							minDate={MIN_DATE}
							{maxDate}
							onchange={handleDateRangeChange}
						/>
						<span class="text-xs text-mid-grey whitespace-nowrap">
							{activeMetric === 'energy'
								? `Energy (${displayInterval === '1M' ? 'monthly' : 'daily'})`
								: `Power (${displayInterval === '30m' ? '30min' : '5min'})`}
						</span>
					</div>

					<!-- Chart -->
					<div class="bg-light-warm-grey/30 rounded-xl p-4">
						<FacilityChart
							bind:this={chartComponent}
							facility={selectedFacility}
							powerData={data.powerData}
							{timeZone}
							{dateStart}
							{dateEnd}
							interval={activeInterval}
							metric={activeMetric}
							onviewportchange={handleViewportChange}
							onvisibledata={handleVisibleData}
							ondisplayintervalchange={(intv) => (displayInterval = intv)}
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
