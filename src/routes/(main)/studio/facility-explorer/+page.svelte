<script>
	/**
	 * Facility Explorer
	 *
	 * Displays 7-day power generation data for a selected facility
	 * with unit-level breakdown by fuel technology.
	 */

	import { goto } from '$app/navigation';
	import {
		ChartStore,
		StratumChart,
		DateBrush,
		IntervalSelector,
		INTERVAL_OPTIONS,
		processForChart,
		aggregateData
	} from '$lib/components/charts/v2';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { loadFuelTechs, fuelTechNameMap, isLoad } from '$lib/fuel_techs';
	import detailedGroup from '$lib/fuel-tech-groups/detailed';
	import { buildUnitColourMap, transformFacilityPowerData } from './helpers';

	/** Fuel tech display order from detailed group */
	const fuelTechOrder = detailedGroup.order;

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

	let selectedInterval = $state('30m');
	/** @type {[Date, Date] | undefined} */
	let brushedRange = $state(undefined);
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

	/**
	 * Map offset to IANA timezone for Intl.DateTimeFormat (which doesn't support offsets)
	 * Uses DST-free zones: Brisbane (AEST +10), Perth (AWST +8)
	 */
	let ianaTimeZone = $derived(timeZone === '+08:00' ? 'Australia/Perth' : 'Australia/Brisbane');

	// ============================================
	// Derived: Unit Analysis
	// ============================================

	/**
	 * Build colour map for units with shading for same fuel tech
	 */
	let unitColours = $derived.by(() => {
		if (!selectedFacility?.units) return {};
		return buildUnitColourMap(selectedFacility.units, getFuelTechColor);
	});

	/**
	 * Build a map from unit code to fuel tech
	 */
	let unitFuelTechMap = $derived.by(() => {
		if (!selectedFacility?.units) return {};

		/** @type {Record<string, string>} */
		const map = {};
		for (const unit of selectedFacility.units) {
			map[unit.code] = unit.fueltech_id;
		}
		return map;
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

	/**
	 * Compute unit order based on fuel tech order
	 * Returns unit IDs (power_XXXX) sorted by their fuel tech's position in fuelTechOrder
	 */
	let unitOrder = $derived.by(() => {
		if (!selectedFacility?.units) return [];

		// Create array of [unitId, fueltech] pairs
		const unitPairs = selectedFacility.units.map((/** @type {any} */ unit) => ({
			id: `power_${unit.code}`,
			fueltech: unit.fueltech_id
		}));

		// Sort by fuel tech order position
		unitPairs.sort((a, b) => {
			const aIndex = fuelTechOrder.indexOf(a.fueltech);
			const bIndex = fuelTechOrder.indexOf(b.fueltech);
			// If not in order array, put at end
			const aPos = aIndex === -1 ? 999 : aIndex;
			const bPos = bIndex === -1 ? 999 : bIndex;
			return aPos - bPos;
		});

		return unitPairs.map((p) => p.id);
	});

	// ============================================
	// Chart Store - created with data in single derived
	// ============================================

	let chartStore = $derived.by(() => {
		if (!selectedFacility || !data.powerData) return null;

		// Transform power data
		const transformed = transformFacilityPowerData(data.powerData, unitFuelTechMap);
		if (!transformed.length) return null;

		// Get colour map
		const colourMap = unitColours;

		// Find load series
		/** @type {string[]} */
		const loadIds = [];
		for (const series of transformed) {
			if (loadFuelTechs.includes(series.fueltech_id || '')) {
				loadIds.push(series.id);
			}
		}

		// Process data with fuel tech ordering
		const processed = processForChart(transformed, 'W', {
			groupOrder: unitOrder,
			loadsToInvert: loadIds,
			labelReducer: (/** @type {Object} */ acc, /** @type {any} */ d) => {
				const unitCode = d.unit?.code || d.id;
				const fuelTech = d.unit?.fueltech_id || d.fueltech_id || 'unknown';
				acc[d.id] = `${unitCode} (${fuelTechNameMap[fuelTech] || fuelTech})`;
				return acc;
			},
			colourReducer: (/** @type {Object} */ acc, /** @type {any} */ d) => {
				const unitCode = d.unit?.code || d.id;
				const fuelTech = d.unit?.fueltech_id || d.fueltech_id || 'unknown';
				acc[d.id] = colourMap[unitCode] || getFuelTechColor(fuelTech);
				return acc;
			}
		});

		// Create chart with data already set
		const chart = new ChartStore({
			key: Symbol('facility-chart'),
			title: selectedFacility.name || 'Facility Power',
			prefix: 'M',
			displayPrefix: 'M',
			baseUnit: 'W',
			timeZone: timeZone
		});
		chart.chartStyles.chartHeightClasses = 'h-[400px]';

		// Set data immediately
		let seriesData = processed.data;
		if (selectedInterval === '30m') {
			seriesData = aggregateData(seriesData, '30m', processed.seriesNames);
		}
		if (brushedRange) {
			const [start, end] = brushedRange;
			seriesData = seriesData.filter((/** @type {any} */ d) => {
				const time = d.date?.getTime?.() ?? d.time;
				return time >= start.getTime() && time <= end.getTime();
			});
		}

		chart.seriesData = seriesData;
		chart.seriesNames = processed.seriesNames;
		chart.seriesColours = processed.seriesColours;
		chart.seriesLabels = processed.seriesLabels;
		chart.formatTickX = formatXAxis;

		return chart;
	});

	let brushChart = $derived.by(() => {
		if (!selectedFacility || !data.powerData) return null;

		// Transform power data
		const transformed = transformFacilityPowerData(data.powerData, unitFuelTechMap);
		if (!transformed.length) return null;

		const colourMap = unitColours;
		/** @type {string[]} */
		const loadIds = [];
		for (const series of transformed) {
			if (loadFuelTechs.includes(series.fueltech_id || '')) {
				loadIds.push(series.id);
			}
		}

		const processed = processForChart(transformed, 'W', {
			groupOrder: unitOrder,
			loadsToInvert: loadIds,
			labelReducer: (/** @type {Object} */ acc, /** @type {any} */ d) => {
				acc[d.id] = d.unit?.code || d.id;
				return acc;
			},
			colourReducer: (/** @type {Object} */ acc, /** @type {any} */ d) => {
				const unitCode = d.unit?.code || d.id;
				const fuelTech = d.unit?.fueltech_id || d.fueltech_id || 'unknown';
				acc[d.id] = colourMap[unitCode] || getFuelTechColor(fuelTech);
				return acc;
			}
		});

		const chart = new ChartStore({
			key: Symbol('brush-chart'),
			title: 'Brush',
			prefix: 'M',
			displayPrefix: 'M',
			baseUnit: 'W',
			timeZone: timeZone
		});

		let seriesData = processed.data;
		if (selectedInterval === '30m') {
			seriesData = aggregateData(seriesData, '30m', processed.seriesNames);
		}

		chart.seriesData = seriesData;
		chart.seriesNames = processed.seriesNames;
		chart.seriesColours = processed.seriesColours;
		chart.seriesLabels = processed.seriesLabels;

		return chart;
	});

	let isDataReady = $derived(chartStore !== null);

	// ============================================
	// Formatters
	// ============================================

	/**
	 * Format date for X axis ticks
	 * @param {Date | any} d
	 * @returns {string}
	 */
	function formatXAxis(d) {
		if (!(d instanceof Date)) return String(d);

		const dateStr = new Intl.DateTimeFormat('en-AU', {
			day: 'numeric',
			month: 'short',
			timeZone: ianaTimeZone
		}).format(d);

		const timeStr = new Intl.DateTimeFormat('en-AU', {
			hour: '2-digit',
			minute: '2-digit',
			hour12: false,
			timeZone: ianaTimeZone
		}).format(d);

		return `${dateStr}, ${timeStr}`;
	}

	/**
	 * Format date for brush ticks
	 * @param {Date | any} d
	 * @returns {string}
	 */
	function formatBrushTick(d) {
		if (!(d instanceof Date)) return String(d);
		return new Intl.DateTimeFormat('en-AU', {
			day: 'numeric',
			month: 'short',
			timeZone: ianaTimeZone
		}).format(d);
	}

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

	/**
	 * Handle interval change
	 * @param {string} interval
	 */
	function handleIntervalChange(interval) {
		selectedInterval = interval;
	}

	/**
	 * Handle brush selection change
	 * @param {[Date, Date] | undefined} range
	 */
	function handleBrush(range) {
		brushedRange = range;
	}

	/** Clear brush selection */
	function clearBrush() {
		brushedRange = undefined;
	}

	/**
	 * Handle hover and update chart
	 * @param {number} time
	 * @param {string} [key]
	 */
	function handleHover(time, key) {
		chartStore.setHover(time, key);
	}

	/** Handle hover end */
	function handleHoverEnd() {
		chartStore.clearHover();
	}

	/**
	 * Handle focus (click)
	 * @param {number} time
	 */
	function handleFocus(time) {
		chartStore.toggleFocus(time);
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

		<!-- Chart Controls -->
		<div class="flex flex-wrap items-center justify-between gap-4 mb-4">
			<div class="flex items-center gap-4">
				<IntervalSelector
					options={INTERVAL_OPTIONS.filter((o) => ['5m', '30m'].includes(o.value))}
					selected={selectedInterval}
					onchange={handleIntervalChange}
				/>

				<!-- Date Range Picker -->
				<div class="flex items-center gap-2">
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
			</div>

			{#if brushedRange}
				<button
					class="text-sm text-blue-600 hover:text-blue-800 cursor-pointer"
					onclick={clearBrush}
				>
					Clear zoom
				</button>
			{/if}
		</div>

		<!-- Date Brush -->
		{#if isDataReady && brushChart}
			<div class="mb-6">
				<DateBrush
					chart={brushChart}
					{brushedRange}
					onbrush={handleBrush}
					formatTick={formatBrushTick}
				/>
			</div>
		{/if}

		<!-- Main Chart -->
		{#if isDataReady && chartStore}
			<div class="border border-light-warm-grey rounded-lg p-4">
				<StratumChart
					chart={chartStore}
					onhover={handleHover}
					onhoverend={handleHoverEnd}
					onfocus={handleFocus}
				/>
			</div>
		{:else if data.powerData === null && !data.error}
			<div class="flex items-center justify-center py-12">
				<div class="flex items-center gap-3 text-mid-warm-grey">
					<svg
						class="animate-spin h-5 w-5"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<span>Loading power data...</span>
				</div>
			</div>
		{/if}

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
