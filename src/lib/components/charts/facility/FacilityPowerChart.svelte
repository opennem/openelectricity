<script>
	/**
	 * FacilityPowerChart - Reusable facility power visualization component
	 *
	 * Displays power generation data for a facility with unit-level breakdown,
	 * interval selection, date brushing, and fuel tech color coding.
	 */

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
	import { loadFuelTechs, fuelTechNameMap } from '$lib/fuel_techs';
	import detailedGroup from '$lib/fuel-tech-groups/detailed';
	import { buildUnitColourMap, transformFacilityPowerData } from './helpers.js';
	import chroma from 'chroma-js';
	import { untrack } from 'svelte';

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
	 * @property {any} facility - Facility object with units array
	 * @property {any} powerData - Power data from API
	 * @property {string} timeZone - Timezone offset string (+10:00 or +08:00)
	 * @property {string} [title] - Chart title
	 * @property {string} [defaultInterval] - Default interval (5m or 30m)
	 * @property {string} [chartHeight] - Chart height class
	 * @property {boolean} [showZoomBrush] - Show/hide the zoom brush (default: true)
	 * @property {boolean} [useDivergingStack] - Stack positive/negative values independently (default: false)
	 */

	/** @type {Props} */
	let {
		facility,
		powerData,
		timeZone,
		title = '',
		defaultInterval = '30m',
		chartHeight = 'h-[400px]',
		showZoomBrush = true,
		useDivergingStack = false
	} = $props();

	// ============================================
	// State
	// ============================================

	// Initialize with prop value (intentionally captures initial value only)
	let selectedInterval = $state(untrack(() => defaultInterval));
	/** @type {[Date, Date] | undefined} */
	let brushedRange = $state(undefined);

	// ============================================
	// Derived: Timezone
	// ============================================

	/**
	 * Map offset to IANA timezone for Intl.DateTimeFormat (which doesn't support offsets)
	 * Uses DST-free zones: Brisbane (AEST +10), Perth (AWST +8)
	 */
	let ianaTimeZone = $derived(timeZone === '+08:00' ? 'Australia/Perth' : 'Australia/Brisbane');

	/**
	 * Get start of day in the facility's timezone
	 * @param {Date} date
	 * @returns {Date}
	 */
	function getStartOfDay(date) {
		// Format the date in the facility timezone to get local date parts
		const formatter = new Intl.DateTimeFormat('en-AU', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			timeZone: ianaTimeZone
		});
		const parts = formatter.formatToParts(date);
		const year = parseInt(parts.find((p) => p.type === 'year')?.value || '0');
		const month = parseInt(parts.find((p) => p.type === 'month')?.value || '0') - 1;
		const day = parseInt(parts.find((p) => p.type === 'day')?.value || '0');

		// Create a date at midnight in UTC, then adjust for timezone offset
		const offsetHours = timeZone === '+08:00' ? 8 : 10;
		return new Date(Date.UTC(year, month, day, -offsetHours, 0, 0, 0));
	}

	/**
	 * Compute day-start dates from series data for gridlines
	 * @param {any[]} data - Series data with date property
	 * @returns {Date[]}
	 */
	function getDayStartDates(data) {
		if (!data?.length) return [];

		const dayStarts = new Set();
		/** @type {Date[]} */
		const result = [];

		for (const d of data) {
			const date = d.date || new Date(d.time);
			const dayStart = getStartOfDay(date);
			const key = dayStart.getTime();

			if (!dayStarts.has(key)) {
				dayStarts.add(key);
				result.push(dayStart);
			}
		}

		return result.sort((a, b) => a.getTime() - b.getTime());
	}

	// ============================================
	// Derived: Unit Analysis
	// ============================================

	/**
	 * Build colour map for units with shading for same fuel tech
	 */
	let unitColours = $derived.by(() => {
		if (!facility?.units) return {};
		return buildUnitColourMap(facility.units, getFuelTechColor);
	});

	/**
	 * Build a map from unit code to fuel tech
	 */
	let unitFuelTechMap = $derived.by(() => {
		if (!facility?.units) return {};

		/** @type {Record<string, string>} */
		const map = {};
		for (const unit of facility.units) {
			map[unit.code] = unit.fueltech_id;
		}
		return map;
	});

	/**
	 * Compute unit order based on fuel tech order
	 * Returns unit IDs (power_XXXX) sorted by their fuel tech's position in fuelTechOrder
	 */
	let unitOrder = $derived.by(() => {
		if (!facility?.units) return [];

		// Create array of [unitId, fueltech] pairs
		const unitPairs = facility.units.map((/** @type {any} */ unit) => ({
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

	const BATTERY_FUEL_TECHS = ['battery'];

	/**
	 * Check if all units are battery-related (for lighter negative coloring)
	 */
	let isBatteryFacility = $derived(
		facility?.units?.length > 0 &&
			facility.units.every((/** @type {any} */ u) => BATTERY_FUEL_TECHS.includes(u.fueltech_id))
	);

	/**
	 * Calculate capacity sums for generators (positive) and loads (negative)
	 * Uses capacity_maximum if available, otherwise capacity_registered
	 */
	let capacitySums = $derived.by(() => {
		if (!facility?.units) return { positive: 0, negative: 0 };

		let positive = 0;
		let negative = 0;

		// Check if all units are battery-related
		const allBattery = facility.units.every((/** @type {any} */ u) =>
			BATTERY_FUEL_TECHS.includes(u.fueltech_id)
		);

		for (const unit of facility.units) {
			const capacity = Number(unit.capacity_maximum || unit.capacity_registered) || 0;
			if (loadFuelTechs.includes(unit.fueltech_id)) {
				negative += capacity;
			} else if (allBattery && unit.fueltech_id === 'battery') {
				// For battery-only facilities, battery can both charge and discharge
				// Use same capacity for both positive and negative
				positive += capacity;
				negative += capacity;
			} else {
				positive += capacity;
			}
		}

		// Convert from MW to the chart's unit (MW = M prefix)
		return { positive, negative };
	});

	// ============================================
	// Chart Store - created with data in single derived
	// ============================================

	let chartStore = $derived.by(() => {
		if (!facility || !powerData) return null;

		// Transform power data
		const transformed = transformFacilityPowerData(powerData, unitFuelTechMap);
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
				const baseColor = colourMap[unitCode] || getFuelTechColor(fuelTech);
				// Use lighter shade for loads (negative values)
				const isLoad = loadFuelTechs.includes(fuelTech);
				acc[d.id] = isLoad ? chroma(baseColor).brighten(1).hex() : baseColor;
				return acc;
			}
		});

		// Create chart with data already set
		const chart = new ChartStore({
			key: Symbol('facility-chart'),
			title: facility.name || 'Facility Power',
			prefix: 'M',
			displayPrefix: 'M',
			baseUnit: 'W',
			timeZone: timeZone
		});
		chart.chartStyles.chartHeightClasses = chartHeight;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.useDivergingStack = useDivergingStack;
		chart.lighterNegative = isBatteryFacility;

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

		// Set both tick labels and gridlines to day starts
		const dayStarts = getDayStartDates(seriesData);
		chart.xTicks = dayStarts;
		chart.xGridlineTicks = dayStarts;

		return chart;
	});

	// Update reference lines and yDomain reactively based on chart options
	$effect(() => {
		if (!chartStore) return;

		const isProportion = chartStore.chartOptions.isDataTransformTypeProportion;
		const isChangeSince = chartStore.chartOptions.isDataTransformTypeChangeSince;
		const isLine = chartStore.chartOptions.isChartTypeLine;

		// Don't show capacity lines for proportion view
		if (isProportion) {
			chartStore.yReferenceLines = [];
			chartStore.setYDomain(undefined);
			return;
		}

		// For line view or change since, show single line with max capacity
		if (isLine || isChangeSince) {
			const maxCapacity = Math.max(capacitySums.positive, capacitySums.negative);
			if (maxCapacity > 0) {
				chartStore.yReferenceLines = [
					{
						value: maxCapacity,
						label: 'Capacity',
						colour: 'var(--chart-1)'
					}
				];
				// Set yDomain with padding for the single capacity line
				const padding = 0.15;
				chartStore.setYDomain([0, maxCapacity * (1 + padding)]);
			} else {
				chartStore.yReferenceLines = [];
				chartStore.setYDomain(undefined);
			}
			return;
		}

		// For absolute + area view, show both positive and negative capacity lines
		const refLines = [];
		if (capacitySums.positive > 0) {
			refLines.push({
				value: capacitySums.positive,
				label: 'Generation Capacity',
				colour: 'var(--chart-1)'
			});
		}
		if (capacitySums.negative > 0) {
			refLines.push({
				value: -capacitySums.negative,
				label: 'Load Capacity',
				colour: 'var(--chart-1)'
			});
		}
		chartStore.yReferenceLines = refLines;

		// Set custom Y domain to ensure capacity lines are visible with padding
		const padding = 0.15;
		const yMax = capacitySums.positive > 0 ? capacitySums.positive * (1 + padding) : undefined;
		const yMin = capacitySums.negative > 0 ? -capacitySums.negative * (1 + padding) : undefined;
		if (yMax !== undefined || yMin !== undefined) {
			chartStore.setYDomain([yMin ?? 0, yMax ?? 0]);
		} else {
			chartStore.setYDomain(undefined);
		}
	});

	let brushChart = $derived.by(() => {
		if (!facility || !powerData) return null;

		// Transform power data
		const transformed = transformFacilityPowerData(powerData, unitFuelTechMap);
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
				const baseColor = colourMap[unitCode] || getFuelTechColor(fuelTech);
				// Use lighter shade for loads (negative values)
				const isLoad = loadFuelTechs.includes(fuelTech);
				acc[d.id] = isLoad ? chroma(baseColor).brighten(1).hex() : baseColor;
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
		chart.useDivergingStack = useDivergingStack;

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
	 * Format date for X axis ticks (day starts only)
	 * @param {Date | any} d
	 * @returns {string}
	 */
	function formatXAxis(d) {
		if (!(d instanceof Date)) return String(d);

		return new Intl.DateTimeFormat('en-AU', {
			day: 'numeric',
			month: 'short',
			timeZone: ianaTimeZone
		}).format(d);
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
		chartStore?.setHover(time, key);
	}

	/** Handle hover end */
	function handleHoverEnd() {
		chartStore?.clearHover();
	}

	/**
	 * Handle focus (click)
	 * @param {number} time
	 */
	function handleFocus(time) {
		chartStore?.toggleFocus(time);
	}

	// ============================================
	// Exposed values for parent components
	// ============================================

	/**
	 * Get unit colours map for use in parent component (e.g., units table)
	 * @returns {Record<string, string>}
	 */
	export function getUnitColours() {
		return unitColours;
	}
</script>

<!-- Chart Header -->
<div class="flex flex-wrap items-center justify-between gap-1 mb-0">
	{#if title}
		<h3 class="text-sm font-medium text-dark-grey">{title}</h3>
	{/if}

	<div class="flex items-center gap-4">
		{#if showZoomBrush && brushedRange}
			<button class="text-sm text-blue-600 hover:text-blue-800 cursor-pointer" onclick={clearBrush}>
				Clear zoom
			</button>
		{/if}

		<IntervalSelector
			options={INTERVAL_OPTIONS.filter((o) => ['5m', '30m'].includes(o.value))}
			selected={selectedInterval}
			onchange={handleIntervalChange}
		/>
	</div>
</div>

<!-- Date Brush -->
{#if showZoomBrush && isDataReady && brushChart}
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
{:else if powerData !== null && !isDataReady}
	<!-- No data found -->
	<div
		class="border border-light-warm-grey rounded-lg bg-light-warm-grey/30 flex items-center justify-center {chartHeight}"
	>
		<div class="text-center text-mid-grey">
			<p class="text-sm">No power data found</p>
			<p class="text-xs mt-1">Data may not be available for this facility</p>
		</div>
	</div>
{:else if powerData === null}
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
