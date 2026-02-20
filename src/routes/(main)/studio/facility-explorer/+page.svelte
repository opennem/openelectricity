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
		FacilityUnitsTable
	} from '$lib/components/charts/facility';
	import { analyzeUnits } from '$lib/components/charts/facility/unit-analysis.js';
	import { getRegionLabel } from '../../facilities/_utils/filters';
	import { groupUnits, getExploreUrl } from '../../facilities/_utils/units';
	import formatValue from '../../facilities/_utils/format-value';
	import FuelTechBadge from '../../facilities/_components/FuelTechBadge.svelte';
	import { MapPin, AlertCircle, SearchX, ChevronDown, ExternalLink } from '@lucide/svelte';
	import { ChartRangeBar } from '$lib/components/charts/v2';
	import { Accordion } from 'bits-ui';
	import {
		getMetricIntervalForDays,
		getHysteresisSwitch,
		MIN_DATE,
		getDateStartForRange,
		getDefaultDateEnd,
		buildFacilityExplorerUrl
	} from './_utils';

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

	let dateStart = $state(data.dateStart || getDateStartForRange(data.range ?? 7, data.facility?.units));
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

	let analysis = $derived.by(() => {
		if (!selectedFacility) return null;
		return analyzeUnits(selectedFacility, getFuelTechColor);
	});

	let unitColours = $derived(analysis?.unitColours ?? {});

	// Facility info derived values
	let regionLabel = $derived(
		selectedFacility ? getRegionLabel(selectedFacility.network_id, selectedFacility.network_region) : ''
	);
	let unitGroups = $derived(selectedFacility ? groupUnits(selectedFacility) : []);

	// ============================================
	// Event Handlers
	// ============================================

	/** @type {number | null} */
	let selectedRange = $state(data.range ?? 7);

	/**
	 * Build URL with current params
	 * @param {Record<string, string | null>} overrides
	 * @returns {string}
	 */
	function buildUrl(overrides = {}) {
		return buildFacilityExplorerUrl({
			facility: overrides.facility ?? data.selectedCode,
			dateStart: overrides.date_start !== undefined ? overrides.date_start : dateStart,
			dateEnd: overrides.date_end !== undefined ? overrides.date_end : dateEnd,
			range: overrides.range !== undefined ? overrides.range : selectedRange
		});
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

	/** Latest selectable date: today */
	let maxDate = $derived(new Date().toISOString().slice(0, 10));

	/**
	 * Handle date range change from DateRangePicker — update viewport client-side.
	 * @param {{ start: string, end: string }} range
	 */
	function handleDateRangeChange(range) {
		if (range.start >= range.end) return;

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

		const mi = getMetricIntervalForDays(days);
		activeInterval = mi.interval;
		activeMetric = mi.metric;

		if (data.selectedCode && chartComponent) {
			chartComponent.setViewport(startMs, endMs);
		}

		replaceState(buildUrl({ range: null }), {});
	}

	/** @type {ReturnType<typeof setTimeout> | null} */
	let metricSwitchTimer = null;

	/**
	 * Handle viewport change from chart pan/zoom — sync DateRangePicker display
	 * and auto-switch metric when crossing thresholds.
	 * @param {{ start: number, end: number }} range
	 */
	function handleViewportChange(range) {
		if (isPresetNavigation) {
			isPresetNavigation = false;
		} else {
			selectedRange = null;
		}
		const offsetMs = timeZone === '+08:00' ? 8 * 3600_000 : 10 * 3600_000;
		dateStart = new Date(range.start + offsetMs).toISOString().slice(0, 10);
		dateEnd = new Date(range.end + offsetMs).toISOString().slice(0, 10);

		const durationDays = (range.end - range.start) / (24 * 60 * 60 * 1000);
		const switchResult = getHysteresisSwitch(activeMetric, activeInterval, durationDays);

		if (switchResult) {
			if (metricSwitchTimer) clearTimeout(metricSwitchTimer);
			metricSwitchTimer = setTimeout(() => {
				activeMetric = switchResult.metric;
				activeInterval = switchResult.interval;
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
	let weightedEmissionsIntensity = $derived(analysis?.weightedEmissionsIntensity ?? null);

	/**
	 * Resolve initial days for metric/interval calculation.
	 * For -1 ("All"), compute actual days from dateStart.
	 */
	function getInitialDays() {
		const range = data.range ?? 3;
		if (range === -1) {
			const start = new Date(dateStart);
			const now = new Date();
			return Math.ceil((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
		}
		return range;
	}

	/** Active interval/metric — derived from initial range */
	const _init = getMetricIntervalForDays(getInitialDays());
	/** @type {string} */
	let activeInterval = $state(_init.interval);
	/** @type {string} */
	let activeMetric = $state(_init.metric);

	/** Display interval — set by FacilityChart toggle (power: '5m'/'30m', energy: '1d'/'1M') */
	/** @type {string} */
	let displayInterval = $state('30m');

	/** Earliest data date for the selected facility (for "All" range) */
	let earliestDate = $derived.by(() => {
		if (!selectedFacility?.units?.length) return null;
		/** @type {string | null} */
		let earliest = null;
		for (const unit of selectedFacility.units) {
			const d = unit.data_first_seen;
			if (d && (!earliest || d < earliest)) earliest = d;
		}
		return earliest ? earliest.slice(0, 10) : null;
	});

	/**
	 * Handle interval change from ChartRangeBar dropdown
	 * @param {string} interval
	 */
	function handleIntervalChange(interval) {
		displayInterval = interval;
		if (interval === '3M' || interval === '1y') {
			activeInterval = interval;
			activeMetric = 'energy';
		} else if (interval === '1d' || interval === '1M') {
			activeInterval = '1d';
			activeMetric = 'energy';
			chartComponent?.setDisplayInterval(interval);
		} else {
			// '5m' or '30m'
			activeInterval = '5m';
			activeMetric = 'power';
			chartComponent?.setDisplayInterval(interval);
		}
	}

	/** Guard: when true, handleViewportChange preserves selectedRange */
	let isPresetNavigation = false;

	/**
	 * Handle quick range selection (1D/3D/7D/1M/6M/1Y/5Y/All)
	 * @param {number} days
	 */
	function handleRangeSelect(days) {
		selectedRange = days;

		let actualDays = days;
		if (days === -1) {
			const refDate = earliestDate || MIN_DATE;
			const startDate = new Date(refDate);
			const nowDate = new Date();
			actualDays = Math.ceil((nowDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
		}

		const mi = getMetricIntervalForDays(actualDays);
		activeInterval = mi.interval;
		activeMetric = mi.metric;

		const tz = timeZone || '+10:00';
		const now = new Date();
		const start = new Date();
		start.setDate(now.getDate() - actualDays);
		dateStart = start.toISOString().slice(0, 10);
		dateEnd = now.toISOString().slice(0, 10);
		if (chartComponent) {
			isPresetNavigation = true;
			const startMs = new Date(dateStart + 'T00:00:00' + tz).getTime();
			const endMs = new Date(dateEnd + 'T23:59:59' + tz).getTime();
			chartComponent.setViewport(startMs, endMs);
		}

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
					<!-- Range / Calendar / Interval toolbar -->
					<div class="mb-4">
						<ChartRangeBar
							{selectedRange}
							{activeMetric}
							{displayInterval}
							startDate={dateStart}
							endDate={dateEnd}
							minDate={MIN_DATE}
							{maxDate}
							{earliestDate}
							onrangeselect={handleRangeSelect}
							ondaterangechange={handleDateRangeChange}
							onintervalchange={handleIntervalChange}
						/>
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
							showIntervalToggle={false}
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
