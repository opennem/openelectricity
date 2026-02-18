<script>
	/**
	 * FacilityChart - Reusable facility power visualization component
	 *
	 * Displays power generation data for a facility with unit-level breakdown,
	 * horizontal panning, client-side data caching, and fuel tech color coding.
	 */

	import {
		ChartStore,
		StratumChart
	} from '$lib/components/charts/v2';
	import { aggregateToInterval, aggregateToMonth } from '$lib/components/charts/v2/dataProcessing.js';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { loadFuelTechs, fuelTechNameMap } from '$lib/fuel_techs';
	import detailedGroup from '$lib/fuel-tech-groups/detailed';
	import { buildUnitColourMap } from './helpers.js';
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
	 * @property {string} [interval] - API interval (5m, 1d, 1M)
	 * @property {string} [metric] - API metric (power, energy)
	 * @property {string} [title] - Chart title
	 * @property {string} [chartHeight] - Chart height class
	 * @property {number} [chartHeightPx] - Chart height in pixels (overrides chartHeight when set)
	 * @property {boolean} [useDivergingStack] - Stack positive/negative values independently (default: false)
	 * @property {string} [dateStart] - Initial date start string (YYYY-MM-DD) for viewport when no seeded cache
	 * @property {string} [dateEnd] - Initial date end string (YYYY-MM-DD) for viewport when no seeded cache
	 * @property {((range: {start: number, end: number}) => void)} [onviewportchange] - Callback when viewport changes (for DateRangePicker sync)
	 * @property {((tableData: {data: any[], seriesNames: string[], seriesLabels: Record<string, string>}) => void)} [onvisibledata] - Callback with debounced visible data for external table
	 * @property {((interval: string) => void)} [ondisplayintervalchange] - Callback when display interval changes (power: '5m'/'30m', energy: '1d'/'1M')
	 */

	/** @type {Props} */
	let {
		facility,
		powerData,
		timeZone,
		interval = '5m',
		metric = 'power',
		title = '',
		chartHeight = 'h-[400px]',
		chartHeightPx = 0,
		useDivergingStack = false,
		dateStart = '',
		dateEnd = '',
		onviewportchange,
		onvisibledata,
		ondisplayintervalchange
	} = $props();

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

	let unitColours = $derived.by(() => {
		if (!facility?.units) return {};
		return buildUnitColourMap(facility.units, getFuelTechColor);
	});

	let unitFuelTechMap = $derived.by(() => {
		if (!facility?.units) return {};

		/** @type {Record<string, string>} */
		const map = {};
		for (const unit of facility.units) {
			map[unit.code] = unit.fueltech_id;
		}
		return map;
	});

	/** Map from unit.code → unit.code_display for UI labels */
	let unitCodeDisplayMap = $derived.by(() => {
		if (!facility?.units) return {};

		/** @type {Record<string, string>} */
		const map = {};
		for (const unit of facility.units) {
			if (unit.code_display) {
				map[unit.code] = unit.code_display;
			}
		}
		return map;
	});

	let unitOrder = $derived.by(() => {
		if (!facility?.units) return [];

		const unitPairs = facility.units.map((/** @type {any} */ unit) => ({
			id: `power_${unit.code}`,
			fueltech: unit.fueltech_id
		}));

		unitPairs.sort((/** @type {any} */ a, /** @type {any} */ b) => {
			const aIndex = fuelTechOrder.indexOf(a.fueltech);
			const bIndex = fuelTechOrder.indexOf(b.fueltech);
			const aPos = aIndex === -1 ? 999 : aIndex;
			const bPos = bIndex === -1 ? 999 : bIndex;
			return aPos - bPos;
		});

		return unitPairs.map((/** @type {any} */ p) => p.id);
	});

	/** @type {string[]} */
	let loadIds = $derived.by(() => {
		if (!facility?.units) return [];
		const ids = [];
		for (const unit of facility.units) {
			if (loadFuelTechs.includes(unit.fueltech_id)) {
				ids.push(`power_${unit.code}`);
			}
		}
		return ids;
	});

	const BATTERY_FUEL_TECHS = ['battery'];

	let hasBatteryUnits = $derived(
		facility?.units?.some((/** @type {any} */ u) => BATTERY_FUEL_TECHS.includes(u.fueltech_id))
	);

	let capacitySums = $derived.by(() => {
		if (!facility?.units) return { positive: 0, negative: 0 };

		let positive = 0;
		let negative = 0;

		const allBattery = facility.units.every((/** @type {any} */ u) =>
			BATTERY_FUEL_TECHS.includes(u.fueltech_id)
		);

		for (const unit of facility.units) {
			const capacity = Number(unit.capacity_maximum || unit.capacity_registered) || 0;
			if (loadFuelTechs.includes(unit.fueltech_id)) {
				negative += capacity;
			} else if (allBattery && unit.fueltech_id === 'battery') {
				positive += capacity;
				negative += capacity;
			} else {
				positive += capacity;
			}
		}

		return { positive, negative };
	});

	// ============================================
	// Viewport State
	// ============================================

	/** @type {number} */
	let viewStart = $state(0);
	/** @type {number} */
	let viewEnd = $state(0);

	/** Whether the user has manually picked an interval (overrides auto) */
	let manualInterval = $state(/** @type {'5m' | '30m' | null} */ (null));

	/** Auto-select 5m when zoomed into ≤1 day, 30m otherwise */
	const AUTO_5M_THRESHOLD_MS = 24 * 60 * 60 * 1000;
	let autoInterval = $derived(
		/** @type {'5m' | '30m'} */ (viewEnd - viewStart <= AUTO_5M_THRESHOLD_MS ? '5m' : '30m')
	);

	// Clear manual override when auto interval changes (zoom crosses threshold)
	$effect(() => {
		const _auto = autoInterval; // track
		manualInterval = null;
	});

	/** @type {'5m' | '30m'} */
	let selectedInterval = $derived(manualInterval ?? autoInterval);

	/** Whether the user has manually picked an energy display interval */
	let manualEnergyInterval = $state(/** @type {'1d' | '1M' | null} */ (null));

	/** Auto-select monthly when viewport > 1 year, daily otherwise */
	const AUTO_MONTHLY_THRESHOLD_MS = 366 * 24 * 60 * 60 * 1000;
	let autoEnergyInterval = $derived(
		/** @type {'1d' | '1M'} */ (viewEnd - viewStart >= AUTO_MONTHLY_THRESHOLD_MS ? '1M' : '1d')
	);

	// Clear manual energy override when auto changes (zoom crosses threshold)
	$effect(() => {
		const _auto = autoEnergyInterval;
		manualEnergyInterval = null;
	});

	/** @type {'1d' | '1M'} */
	let selectedEnergyInterval = $derived(manualEnergyInterval ?? autoEnergyInterval);

	/** Whether we're showing energy data (1d interval) vs power (5m) */
	let isEnergyMetric = $derived(metric === 'energy');

	// Notify parent when effective display interval changes
	$effect(() => {
		const intv = isEnergyMetric ? selectedEnergyInterval : selectedInterval;
		ondisplayintervalchange?.(intv);
	});

	/** Minimum viewport duration: 1 hour for power, 5 days for energy */
	let MIN_VIEWPORT_MS = $derived(isEnergyMetric ? 5 * 24 * 60 * 60 * 1000 : 1 * 60 * 60 * 1000);
	/** Maximum viewport duration: 16 days for power, 10 years for energy */
	let MAX_VIEWPORT_MS = $derived(isEnergyMetric ? 10 * 365 * 24 * 60 * 60 * 1000 : 16 * 24 * 60 * 60 * 1000);

	/** Prefetch buffer multiplier — energy uses wider buffers since intervals are daily */
	let fetchBufferMultiplier = $derived(isEnergyMetric ? 3 : 1);

	/** Track the last pan direction for prefetching */
	/** @type {number} */
	let lastPanDelta = $state(0);

	/** Whether we're currently in a pan gesture */
	let isPanning = $state(false);

	// ============================================
	// Data Manager
	// ============================================

	/**
	 * Get display label for a unit
	 * @param {string} unitCode
	 * @param {string} fuelTech
	 * @returns {string}
	 */
	function getLabel(unitCode, fuelTech) {
		const displayCode = unitCodeDisplayMap[unitCode] ?? unitCode;
		return `${displayCode} (${fuelTechNameMap[fuelTech] || fuelTech})`;
	}

	/**
	 * Get colour for a unit — needs dynamic unitColours
	 */
	let getColour = $derived.by(() => {
		const colourMap = unitColours;
		return (/** @type {string} */ unitCode, /** @type {string} */ fuelTech) => {
			const baseColor = colourMap[unitCode] || getFuelTechColor(fuelTech);
			const isLoad = loadFuelTechs.includes(fuelTech);
			return isLoad ? chroma(baseColor).brighten(1).hex() : baseColor;
		};
	});

	/** @type {ChartDataManager | null} */
	let dataManager = $state(null);

	/** @type {Map<string, ChartDataManager>} Background prefetched managers */
	let prefetchCache = new Map();

	// Initialize/reinitialize data manager when facility or interval/metric changes
	$effect(() => {
		if (!facility) {
			dataManager = null;
			prefetchCache.clear();
			return;
		}

		// Track interval and metric as dependencies
		const currentInterval = interval;
		const currentMetric = metric;
		const currentCode = facility.code;

		// Clear prefetch cache if facility changed
		const existingCode = untrack(() => dataManager?.facilityCode);
		if (existingCode && existingCode !== currentCode) {
			prefetchCache.clear();
		}

		// Skip recreation if existing manager already matches
		const existing = untrack(() => dataManager);
		if (
			existing &&
			existing.facilityCode === currentCode &&
			existing.interval === currentInterval &&
			existing.metric === currentMetric
		) {
			return;
		}

		// Check prefetch cache before creating a new manager
		const prefetchKey = `${currentInterval}-${currentMetric}`;
		const prefetched = prefetchCache.get(prefetchKey);
		if (prefetched && prefetched.facilityCode === currentCode) {
			prefetchCache.delete(prefetchKey);
			dataManager = prefetched;

			// Still need to request the viewport range (may already be cached)
			const start = untrack(() => viewStart);
			const end = untrack(() => viewEnd);
			if (start && end) {
				const duration = end - start;
				const bufferMultiplier = currentMetric === 'energy' ? 3 : 1;
				const buffer = duration * bufferMultiplier;
				prefetched.requestRange(start - buffer, Math.min(end + buffer, Date.now()));
			}
			return;
		}

		const manager = new ChartDataManager({
			facilityCode: currentCode,
			networkId: facility.network_id,
			interval: currentInterval,
			metric: currentMetric,
			unitFuelTechMap,
			unitOrder,
			loadsToInvert: loadIds,
			getLabel,
			getColour
		});

		// Only seed with server power data if the metric matches and data exists
		if (currentMetric === 'power' && powerData) {
			manager.seedCache(powerData);
		}

		// Use untrack so viewStart/viewEnd don't become dependencies of this effect.
		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);

		if (!start && !end) {
			// First load — set viewport from seeded cache
			if (manager.cacheStart !== null && manager.cacheEnd !== null) {
				viewStart = manager.cacheStart;
				viewEnd = manager.cacheEnd;
			} else if (dateStart && dateEnd) {
				// No seeded cache (e.g. energy mode on page load) — use date props
				const tz = timeZone || '+10:00';
				viewStart = new Date(dateStart + 'T00:00:00' + tz).getTime();
				viewEnd = Math.min(new Date(dateEnd + 'T23:59:59' + tz).getTime(), Date.now());
				const duration = viewEnd - viewStart;
				const bufferMultiplier = currentMetric === 'energy' ? 3 : 1;
				const buffer = duration * bufferMultiplier;
				manager.requestRange(viewStart - buffer, Math.min(viewEnd + buffer, Date.now()));
			}
		} else {
			// Switching interval/metric — keep current viewport, fetch with buffer
			const duration = end - start;
			const bufferMultiplier = currentMetric === 'energy' ? 3 : 1;
			const buffer = duration * bufferMultiplier;
			manager.requestRange(start - buffer, Math.min(end + buffer, Date.now()));
		}

		dataManager = manager;
	});

	// Prefetch common ranges after initial load completes
	$effect(() => {
		const manager = dataManager;
		if (!manager || !manager.initialLoadComplete) return;
		if (!facility) return;

		// Only prefetch from the initial power mode (don't re-prefetch on every switch)
		if (manager.metric !== 'power') return;

		const now = Date.now();

		// 1. Extend power cache to 7 days
		const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
		manager.requestRange(sevenDaysAgo, now);

		// 2. Background energy/1d manager for 1-year range
		const energyKey = '1d-energy';
		if (prefetchCache.has(energyKey)) return;

		const energyManager = new ChartDataManager({
			facilityCode: facility.code,
			networkId: facility.network_id,
			interval: '1d',
			metric: 'energy',
			unitFuelTechMap,
			unitOrder,
			loadsToInvert: loadIds,
			getLabel,
			getColour
		});

		const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
		energyManager.requestRange(oneYearAgo, now);
		prefetchCache.set(energyKey, energyManager);
	});

	// ============================================
	// Chart Store — created once, updated reactively
	// ============================================

	/** @type {import('$lib/components/charts/v2/ChartStore.svelte.js').default | null} */
	let chartStore = $state(null);

	// Create chart store ONCE per facility — never recreated on metric switch.
	// Uses time-series mode for both power and energy (step curves for energy).
	$effect(() => {
		const currentFacility = facility;
		if (!currentFacility) {
			chartStore = null;
			return;
		}

		// Only create if we don't have a store yet (or facility changed)
		const existing = untrack(() => chartStore);
		if (existing) return;

		const chart = new ChartStore({
			key: Symbol('facility-chart'),
			title: currentFacility.name || 'Facility',
			prefix: 'M',
			displayPrefix: 'M',
			baseUnit: 'W',
			timeZone: timeZone
		});
		chart.chartStyles.chartHeightClasses = chartHeight;
		if (chartHeightPx) chart.chartStyles.chartHeightPx = chartHeightPx;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.useDivergingStack = useDivergingStack;
		chart.lighterNegative = hasBatteryUnits;
		chart.formatTickX = formatXAxis;

		chartStore = chart;
	});

	// Update chart height when panel resizes
	$effect(() => {
		if (chartStore && chartHeightPx) {
			chartStore.chartStyles.chartHeightPx = chartHeightPx;
		}
	});

	// Update series metadata when data manager provides processed data
	$effect(() => {
		if (!chartStore || !dataManager?.processedCache) return;

		const processed = dataManager.processedCache;
		chartStore.seriesNames = processed.seriesNames;
		chartStore.seriesColours = processed.seriesColours;
		chartStore.seriesLabels = processed.seriesLabels;
	});

	// Update metric-dependent config (curve type, unit) reactively
	$effect(() => {
		if (!chartStore) return;

		const isEnergy = isEnergyMetric;
		chartStore.chartOptions.baseUnit = isEnergy ? 'Wh' : 'W';
		chartStore.chartOptions.selectedCurveType = /** @type {any} */ (isEnergy ? 'step' : 'straight');
	});

	// Update chart data/domain when viewport, interval, or data changes
	$effect(() => {
		if (!chartStore || !dataManager?.processedCache) return;

		const start = viewStart;
		const end = viewEnd;
		const displayInterval = selectedInterval;
		const energyDisplayInterval = selectedEnergyInterval;
		const isEnergy = isEnergyMetric;

		let visibleData = dataManager.getDataForRange(start, end);

		// Aggregate daily energy to monthly when selected
		if (isEnergy && energyDisplayInterval === '1M' && visibleData.length > 0 && dataManager.seriesMeta) {
			visibleData = aggregateToMonth(
				visibleData,
				dataManager.seriesMeta.seriesNames,
				ianaTimeZone,
				'sum'
			);
		}

		// Aggregate to 30m for power mode when selected
		if (!isEnergy && displayInterval === '30m' && visibleData.length > 0 && dataManager.seriesMeta) {
			visibleData = aggregateToInterval(
				visibleData,
				'30m',
				dataManager.seriesMeta.seriesNames,
				'mean'
			);
		}

		chartStore.seriesData = visibleData;
		chartStore.xDomain = /** @type {[number, number]} */ ([start, end]);

		if (isEnergy && visibleData.length > 1) {
			// Use actual data point times for gridlines — ensures perfect alignment
			// with step curve transitions and hover bands
			/** @type {Date[]} */
			const dataStarts = visibleData.map((/** @type {any} */ d) => new Date(d.time));

			// Detect if data is monthly interval (bandMs > 20 days)
			const bandMsEst = dataStarts.length > 1
				? dataStarts[1].getTime() - dataStarts[0].getTime()
				: 24 * 60 * 60 * 1000;
			const isMonthlyInterval = bandMsEst > 20 * 24 * 60 * 60 * 1000;

			// Viewport duration in years — used for yearly gridline snapping
			const viewportDays = (end - start) / (24 * 60 * 60 * 1000);
			const useYearlyGridlines = viewportDays >= 3 * 365;

			// Smart thinning based on number of data points and interval
			const numPoints = dataStarts.length;
			let skip;
			if (useYearlyGridlines) {
				// 3+ years: yearly gridlines (skip value used for format selection)
				skip = isMonthlyInterval ? 12 : 365;
			} else if (isMonthlyInterval) {
				// Monthly data: thin by calendar-meaningful intervals
				if (numPoints <= 18) skip = 1;        // ≤1.5y: every month
				else if (numPoints <= 24) skip = 3;   // ≤2y: quarterly
				else skip = 6;                         // 2-3y: half-yearly
			} else {
				// Daily data
				if (numPoints <= 14) skip = 1;
				else if (numPoints <= 45) skip = 7;
				else if (numPoints <= 120) skip = 14;
				else if (numPoints <= 400) skip = 30;
				else skip = 90;
			}

			// Build gridlines
			/** @type {Date[]} */
			let thinnedGridlines;
			const ymFmt = new Intl.DateTimeFormat('en-AU', {
				year: 'numeric', month: '2-digit', timeZone: ianaTimeZone
			});

			if (useYearlyGridlines) {
				// Snap to January boundaries (first data point of each year)
				/** @type {Set<string>} */
				const seenYears = new Set();
				thinnedGridlines = [];
				for (const d of dataStarts) {
					const parts = ymFmt.formatToParts(d);
					const y = parts.find((p) => p.type === 'year')?.value;
					const m = parts.find((p) => p.type === 'month')?.value;
					if (m === '01' && y && !seenYears.has(y)) {
						seenYears.add(y);
						thinnedGridlines.push(d);
					}
				}
			} else if (!isMonthlyInterval && skip >= 28) {
				// Daily data at monthly scale: snap to month boundaries
				/** @type {Set<string>} */
				const seen = new Set();
				/** @type {Date[]} */
				const monthBoundaries = [];
				for (const d of dataStarts) {
					const parts = ymFmt.formatToParts(d);
					const y = parts.find((p) => p.type === 'year')?.value;
					const m = parts.find((p) => p.type === 'month')?.value;
					const key = `${y}-${m}`;
					if (!seen.has(key)) {
						seen.add(key);
						monthBoundaries.push(d);
					}
				}
				// Further thin based on number of months visible
				// Update skip to reflect actual months-per-label for format selection
				const numMonths = monthBoundaries.length;
				if (numMonths > 24) {
					// 2+ years: every 6th month (half-yearly)
					thinnedGridlines = monthBoundaries.filter((_, i) => i % 6 === 0);
					skip = 6 * 30; // signal half-yearly to formatter
				} else if (numMonths > 14) {
					// 1-2 years: every 3rd month (quarterly)
					thinnedGridlines = monthBoundaries.filter((_, i) => i % 3 === 0);
					skip = 3 * 30; // signal quarterly to formatter
				} else {
					thinnedGridlines = monthBoundaries;
					skip = 30; // signal monthly to formatter
				}
			} else {
				thinnedGridlines = dataStarts.filter((_, i) => i % skip === 0);
			}

			// Compute midpoints between consecutive gridlines for centered labels
			const bandMs = dataStarts.length > 1
				? dataStarts[1].getTime() - dataStarts[0].getTime()
				: 24 * 60 * 60 * 1000;
			const skipBandMs = bandMs * skip;

			/** @type {Date[]} */
			const midpoints = [];
			/** @type {Map<number, Date>} */
			const midToStart = new Map();
			/** @type {Map<number, Date>} */
			const midToEnd = new Map();

			for (let i = 0; i < thinnedGridlines.length; i++) {
				const bandStart = thinnedGridlines[i];
				const bandEnd = thinnedGridlines[i + 1] || new Date(bandStart.getTime() + skipBandMs);
				const mid = new Date((bandStart.getTime() + bandEnd.getTime()) / 2);
				midpoints.push(mid);
				midToStart.set(mid.getTime(), bandStart);
				// Last data point in this group = one interval before next gridline
				midToEnd.set(mid.getTime(), new Date(bandEnd.getTime() - bandMs));
			}

			chartStore.xGridlineTicks = thinnedGridlines;
			chartStore.xTicks = midpoints;

			// Format: label shows the band start date, positioned at midpoint
			if (useYearlyGridlines) {
				// Yearly labels: "'21 — '22" range or just "'26"
				chartStore.formatTickX = (/** @type {any} */ d) => {
					const date = d instanceof Date ? d : new Date(d);
					const rangeStart = midToStart.get(date.getTime());
					const rangeEnd = midToEnd.get(date.getTime());
					if (!rangeStart) return '';
					const sYear = new Intl.DateTimeFormat('en-AU', { year: 'numeric', timeZone: ianaTimeZone }).format(rangeStart);
					if (!rangeEnd) return sYear;
					const eYear = new Intl.DateTimeFormat('en-AU', { year: 'numeric', timeZone: ianaTimeZone }).format(rangeEnd);
					if (sYear === eYear) return sYear;
					return `${sYear} — ${eYear}`;
				};
			} else if (isMonthlyInterval || skip >= 28) {
				// Monthly labels — only show year when Jan is in the range
				chartStore.formatTickX = (/** @type {any} */ d) => {
					const date = d instanceof Date ? d : new Date(d);
					const rangeStart = midToStart.get(date.getTime()) || date;
					const rangeEnd = midToEnd.get(date.getTime());

					const myfmt = new Intl.DateTimeFormat('en-AU', {
						month: 'short', year: '2-digit', timeZone: ianaTimeZone
					});
					const monthNumFmt = new Intl.DateTimeFormat('en-AU', {
						month: 'numeric', timeZone: ianaTimeZone
					});

					const sParts = myfmt.formatToParts(rangeStart);
					const sMonth = sParts.find((p) => p.type === 'month')?.value || '';
					const sYear = sParts.find((p) => p.type === 'year')?.value || '';
					const sMonthNum = parseInt(monthNumFmt.format(rangeStart));

					// Single-month band: "Jan '26" or "Feb"
					// Check if start and end are in the same month (or no end)
					const eMonthNumVal = rangeEnd ? parseInt(monthNumFmt.format(rangeEnd)) : sMonthNum;
					const eYearVal = rangeEnd ? myfmt.formatToParts(rangeEnd).find((p) => p.type === 'year')?.value : sYear;
					if (!rangeEnd || (sMonthNum === eMonthNumVal && sYear === eYearVal)) {
						return sMonthNum === 1 ? `${sMonth} '${sYear}` : sMonth;
					}

					// Multi-month range
					const eParts = myfmt.formatToParts(rangeEnd);
					const eMonth = eParts.find((p) => p.type === 'month')?.value || '';
					const eYear = eParts.find((p) => p.type === 'year')?.value || '';
					const eMonthNum = parseInt(monthNumFmt.format(rangeEnd));

					// Check if Jan is in the range: start is Jan, or range wraps (end < start)
					const hasJan = sMonthNum === 1 || eMonthNum < sMonthNum;

					if (!hasJan) {
						// No January in range: "Feb — May"
						return `${sMonth} — ${eMonth}`;
					}
					if (sYear !== eYear) {
						// Cross-year with Jan: "Nov — Jan '26"
						return `${sMonth} — ${eMonth} '${eYear}`;
					}
					// Same year with Jan (start is Jan): "Jan — Mar '26"
					return `${sMonth} — ${eMonth} '${eYear}`;
				};
			} else {
				// Daily/weekly: show date range "21 — 27 Jan"
				chartStore.formatTickX = (/** @type {any} */ d) => {
					const date = d instanceof Date ? d : new Date(d);
					const rangeStart = midToStart.get(date.getTime());
					const rangeEnd = midToEnd.get(date.getTime());
					if (!rangeStart || !rangeEnd) return formatXAxis(date);

					// Single-day band (skip=1): just "21 Jan"
					if (rangeStart.getTime() === rangeEnd.getTime()) {
						return formatXAxis(rangeStart);
					}
					return formatDateRange(rangeStart, rangeEnd);
				};
			}
		} else {
			const dayStarts = getDayStartDates(visibleData);
			chartStore.xTicks = dayStarts;
			chartStore.xGridlineTicks = dayStarts;
			chartStore.formatTickX = formatXAxis;
		}
	});

	// Update reference lines and yDomain reactively
	$effect(() => {
		if (!chartStore) return;

		// No capacity reference lines for energy charts (MW doesn't apply to MWh)
		if (isEnergyMetric) {
			chartStore.yReferenceLines = [];
			chartStore.setYDomain(undefined);
			return;
		}

		const isProportion = chartStore.chartOptions.isDataTransformTypeProportion;
		const isChangeSince = chartStore.chartOptions.isDataTransformTypeChangeSince;
		const isLine = chartStore.chartOptions.isChartTypeLine;

		if (isProportion) {
			chartStore.yReferenceLines = [];
			chartStore.setYDomain(undefined);
			return;
		}

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
				const padding = 0.15;
				chartStore.setYDomain([0, maxCapacity * (1 + padding)]);
			} else {
				chartStore.yReferenceLines = [];
				chartStore.setYDomain(undefined);
			}
			return;
		}

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

		const padding = 0.15;
		const yMax = capacitySums.positive > 0 ? capacitySums.positive * (1 + padding) : undefined;
		const yMin = capacitySums.negative > 0 ? -capacitySums.negative * (1 + padding) : undefined;
		if (yMax !== undefined || yMin !== undefined) {
			const minValue = hasBatteryUnits ? (yMin ?? -(yMax ?? 0)) : (yMin ?? 0);
			chartStore.setYDomain([minValue, yMax ?? 0]);
		} else {
			chartStore.setYDomain(undefined);
		}
	});

	/** Debounced callback for visible data — only fires after pan/zoom settles */
	/** @type {ReturnType<typeof setTimeout> | null} */
	let tableDebounceTimer = null;

	$effect(() => {
		// Track reactive dependencies
		const start = viewStart;
		const end = viewEnd;
		const displayInterval = selectedInterval;
		const energyDisplayInterval = selectedEnergyInterval;
		const isEnergy = isEnergyMetric;
		const manager = dataManager;
		const _cache = manager?.processedCache; // track cache changes
		const callback = onvisibledata;

		if (tableDebounceTimer) clearTimeout(tableDebounceTimer);
		if (!callback || !manager?.processedCache || !manager.seriesMeta) return;

		const meta = manager.seriesMeta;
		tableDebounceTimer = setTimeout(() => {
			let rows = manager.getDataForRange(start, end);
			if (isEnergy && energyDisplayInterval === '1M' && rows.length > 0) {
				rows = aggregateToMonth(rows, meta.seriesNames, ianaTimeZone, 'sum');
			} else if (!isEnergy && displayInterval === '30m' && rows.length > 0) {
				rows = aggregateToInterval(rows, '30m', meta.seriesNames, 'mean');
			}
			callback({
				data: rows,
				seriesNames: meta.seriesNames,
				seriesLabels: meta.seriesLabels
			});
		}, 300);
	});

	/**
	 * Show loading overlay when the chart has no visible data and data is being fetched.
	 */
	let showLoadingOverlay = $derived.by(() => {
		if (!dataManager || !chartStore) return false;
		if (chartStore.seriesData.length > 0) return false;

		// No data yet — show overlay if still loading or haven't loaded
		return !dataManager.initialLoadComplete || dataManager.isLoading || dataManager.hasPendingFetch;
	});

	// ============================================
	// Formatters
	// ============================================

	/**
	 * Format date for X axis ticks (day starts only)
	 * @param {Date | any} d
	 * @returns {string}
	 */
	function formatXAxis(d) {
		const date = d instanceof Date ? d : typeof d === 'number' ? new Date(d) : null;
		if (!date) return String(d);

		return new Intl.DateTimeFormat('en-AU', {
			day: 'numeric',
			month: 'short',
			timeZone: ianaTimeZone
		}).format(date);
	}

	/**
	 * Format a date range for x-axis labels in step/energy mode.
	 * Same month: "21 — 27 Jan", different month: "28 Jan — 3 Feb",
	 * different year: "28 Dec '25 — 3 Jan '26"
	 * @param {Date} start
	 * @param {Date} end
	 * @returns {string}
	 */
	function formatDateRange(start, end) {
		const partsFmt = new Intl.DateTimeFormat('en-AU', {
			day: 'numeric',
			month: 'short',
			year: '2-digit',
			timeZone: ianaTimeZone
		});

		const sParts = partsFmt.formatToParts(start);
		const eParts = partsFmt.formatToParts(end);

		const sDay = sParts.find((p) => p.type === 'day')?.value;
		const eDay = eParts.find((p) => p.type === 'day')?.value;
		const sMonth = sParts.find((p) => p.type === 'month')?.value;
		const eMonth = eParts.find((p) => p.type === 'month')?.value;
		const sYear = sParts.find((p) => p.type === 'year')?.value;
		const eYear = eParts.find((p) => p.type === 'year')?.value;

		if (sYear !== eYear) {
			return `${sDay} ${sMonth} '${sYear} — ${eDay} ${eMonth} '${eYear}`;
		}
		if (sMonth !== eMonth) {
			return `${sDay} ${sMonth} — ${eDay} ${eMonth}`;
		}
		return `${sDay} — ${eDay} ${eMonth}`;
	}

	// ============================================
	// Pan Handlers
	// ============================================

	function handlePanStart() {
		isPanning = true;
		// Clear hover during pan
		chartStore?.clearHover();
	}

	/**
	 * Handle pan movement — shift viewport by time delta
	 * @param {number} deltaMs
	 */
	function handlePan(deltaMs) {
		// deltaMs is positive when dragging right (moving backward in time)
		// We invert: dragging right should show earlier data
		let newStart = viewStart - deltaMs;
		let newEnd = viewEnd - deltaMs;

		// Clamp: don't allow panning past current time
		const now = Date.now();
		if (newEnd > now) {
			newEnd = now;
			newStart = now - (viewEnd - viewStart);
		}

		viewStart = newStart;
		viewEnd = newEnd;
		lastPanDelta = deltaMs;

		// Request data for any uncached range (wider buffer for energy)
		const viewportWidth = viewEnd - viewStart;
		const buffer = viewportWidth * fetchBufferMultiplier;
		dataManager?.requestRange(viewStart - buffer, viewEnd + buffer);
	}

	function handlePanEnd() {
		isPanning = false;

		// Prefetch ahead in the pan direction (wider for energy)
		const viewportWidth = viewEnd - viewStart;
		const prefetch = viewportWidth * fetchBufferMultiplier;
		const now = Date.now();
		if (lastPanDelta < 0 && viewEnd < now) {
			// Was panning left (toward future) — prefetch ahead, clamped to now
			dataManager?.requestRange(viewEnd, Math.min(viewEnd + prefetch, now));
		} else if (lastPanDelta > 0) {
			// Was panning right (toward past) — prefetch behind
			dataManager?.requestRange(viewStart - prefetch, viewStart);
		}

		// Notify parent of viewport change
		onviewportchange?.({ start: viewStart, end: viewEnd });
	}

	// ============================================
	// Zoom Handler
	// ============================================

	/**
	 * Handle zoom — scale viewport around the cursor/pinch center point.
	 * @param {number} factor - Zoom factor (>1 = zoom in, <1 = zoom out)
	 * @param {number} centerMs - Time position to anchor the zoom to
	 */
	function handleZoom(factor, centerMs) {
		const duration = viewEnd - viewStart;
		const newDuration = Math.min(Math.max(duration / factor, MIN_VIEWPORT_MS), MAX_VIEWPORT_MS);

		// Anchor zoom to cursor position — keep centerMs at the same screen proportion
		const ratio = (centerMs - viewStart) / duration;
		let newStart = centerMs - ratio * newDuration;
		let newEnd = newStart + newDuration;

		// Clamp to present
		const now = Date.now();
		if (newEnd > now) {
			newEnd = now;
			newStart = now - newDuration;
		}

		viewStart = newStart;
		viewEnd = newEnd;

		// Request data for any uncached range (wider buffer for energy)
		const buffer = newDuration * fetchBufferMultiplier;
		dataManager?.requestRange(viewStart - buffer, viewEnd + buffer);

		// Notify parent of viewport change
		onviewportchange?.({ start: viewStart, end: viewEnd });
	}

	// ============================================
	// Wheel Zoom (on container div, outside SVG)
	// ============================================

	/** @type {HTMLDivElement | undefined} */
	let chartContainerEl = $state(undefined);

	/**
	 * Wheel zoom handler — attached imperatively with { passive: false }
	 * on the chart container div so preventDefault() works.
	 * Only activates when Cmd (Mac) or Ctrl (Win/Linux) is held.
	 * @param {WheelEvent} event
	 */
	function handleWheel(event) {
		if (!event.metaKey && !event.ctrlKey) return;

		event.preventDefault();

		const factor = Math.pow(1.002, -event.deltaY);

		// Approximate cursor position in time-domain using the div's width
		const rect = /** @type {HTMLElement} */ (event.currentTarget).getBoundingClientRect();
		const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
		const centerMs = viewStart + ratio * (viewEnd - viewStart);

		handleZoom(factor, centerMs);
	}

	// Attach wheel listener imperatively with { passive: false }
	$effect(() => {
		const el = chartContainerEl;
		if (!el) return;

		el.addEventListener('wheel', handleWheel, { passive: false });
		return () => el.removeEventListener('wheel', handleWheel);
	});

	// ============================================
	// Button Zoom
	// ============================================

	/** Zoom factor per button click */
	const BUTTON_ZOOM_FACTOR = 1.5;

	function zoomIn() {
		const center = (viewStart + viewEnd) / 2;
		handleZoom(BUTTON_ZOOM_FACTOR, center);
	}

	function zoomOut() {
		const center = (viewStart + viewEnd) / 2;
		handleZoom(1 / BUTTON_ZOOM_FACTOR, center);
	}

	let isAtMinZoom = $derived(viewEnd - viewStart <= MIN_VIEWPORT_MS);
	let isAtMaxZoom = $derived(viewEnd - viewStart >= MAX_VIEWPORT_MS);

	// ============================================
	// Hover/Focus Handlers
	// ============================================

	/**
	 * @param {number} time
	 * @param {string} [key]
	 */
	function handleHover(time, key) {
		if (isPanning) return;
		chartStore?.setHover(time, key);
	}

	function handleHoverEnd() {
		chartStore?.clearHover();
	}

	/**
	 * @param {number} time
	 */
	function handleFocus(time) {
		if (isPanning) return;
		chartStore?.toggleFocus(time);
	}

	// ============================================
	// Public Methods
	// ============================================

	/**
	 * Set viewport to a specific time range (e.g. from DateRangePicker)
	 * @param {number} startMs
	 * @param {number} endMs
	 */
	export function setViewport(startMs, endMs) {
		const now = Date.now();
		viewStart = startMs;
		viewEnd = Math.min(endMs, now);

		// Prefetch with buffer so panning has data ready
		const duration = viewEnd - viewStart;
		const buffer = duration * fetchBufferMultiplier;
		dataManager?.requestRange(viewStart - buffer, Math.min(viewEnd + buffer, now));
	}

	/**
	 * Get unit colours map for use in parent component (e.g., units table)
	 * @returns {Record<string, string>}
	 */
	export function getUnitColours() {
		return unitColours;
	}
</script>

<!-- Chart Header -->
<div class="flex flex-wrap items-center justify-between gap-1 mb-1">
	{#if title}
		<h3 class="text-sm font-medium text-dark-grey">{title}</h3>
	{/if}

	<div class="flex items-center gap-2">
		{#if !isEnergyMetric}
			<div class="flex items-center gap-0.5 bg-light-warm-grey rounded-md p-0.5">
				{#each ['5m', '30m'] as intv}
					<button
						class="px-2.5 py-1 text-xs font-medium rounded transition-colors {selectedInterval === intv
							? 'bg-white text-dark-grey shadow-sm'
							: 'text-mid-grey hover:text-dark-grey'}"
						onclick={() => {
							manualInterval = /** @type {'5m' | '30m'} */ (intv);
						}}
					>
						{intv === '5m' ? '5 min' : '30 min'}
					</button>
				{/each}
			</div>
		{:else}
			<div class="flex items-center gap-0.5 bg-light-warm-grey rounded-md p-0.5">
				{#each ['1d', '1M'] as intv}
					<button
						class="px-2.5 py-1 text-xs font-medium rounded transition-colors {selectedEnergyInterval === intv
							? 'bg-white text-dark-grey shadow-sm'
							: 'text-mid-grey hover:text-dark-grey'}"
						onclick={() => {
							manualEnergyInterval = /** @type {'1d' | '1M'} */ (intv);
						}}
					>
						{intv === '1d' ? 'Daily' : 'Monthly'}
					</button>
				{/each}
			</div>
		{/if}

		<div class="flex items-center gap-0.5 bg-light-warm-grey rounded-md p-0.5">
			<button
				class="px-1.5 py-1 text-xs font-medium rounded transition-colors {isAtMaxZoom ? 'text-mid-warm-grey cursor-not-allowed' : 'text-mid-grey hover:text-dark-grey hover:bg-white'}"
				onclick={zoomOut}
				disabled={isAtMaxZoom}
				title="Zoom out"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
			</button>
			<button
				class="px-1.5 py-1 text-xs font-medium rounded transition-colors {isAtMinZoom ? 'text-mid-warm-grey cursor-not-allowed' : 'text-mid-grey hover:text-dark-grey hover:bg-white'}"
				onclick={zoomIn}
				disabled={isAtMinZoom}
				title="Zoom in"
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
			</button>
		</div>
	</div>
</div>

<!-- Main Chart -->
{#if chartStore}
	<div bind:this={chartContainerEl} class="border border-light-warm-grey rounded-lg p-4 relative">
		<StratumChart
			chart={chartStore}
			onhover={handleHover}
			onhoverend={handleHoverEnd}
			onfocus={handleFocus}
			onpanstart={handlePanStart}
			onpan={handlePan}
			onpanend={handlePanEnd}
			onzoom={handleZoom}
			enablePan={true}
			viewDomain={null}
			loadingRanges={dataManager?.loadingRanges ?? []}
		/>

		{#if showLoadingOverlay}
			<!-- Loading overlay — previous chart stays visible underneath -->
			<div class="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
				<div class="flex items-center gap-3 text-mid-warm-grey">
					<svg
						class="animate-spin h-5 w-5"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<span class="text-sm">Loading data...</span>
				</div>
			</div>
		{/if}
	</div>

{:else}
	<!-- No facility — chart store not created yet -->
	<div
		class="border border-light-warm-grey rounded-lg bg-light-warm-grey/30 flex items-center justify-center {chartHeightPx ? '' : chartHeight}"
		style:height={chartHeightPx ? `${chartHeightPx}px` : undefined}
	>
		<div class="flex items-center gap-3 text-mid-warm-grey">
			<svg
				class="animate-spin h-5 w-5"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<span class="text-sm">Loading data...</span>
		</div>
	</div>
{/if}
