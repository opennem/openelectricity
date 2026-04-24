<script>
	/**
	 * FacilityFinancialDataProvider — owns the shared state for the facility
	 * financial charts (Price line + Market Value stacked area). Two sibling
	 * components (`FacilityPriceChart`, `FacilityMarketValueChart`) render from
	 * the context this provider sets up, so a single data fetch powers both.
	 *
	 * When `active` is false, no data managers are created and no fetches fire
	 * — safe to always wrap even when financial charts are hidden.
	 */

	import { ChartStore } from '$lib/components/charts/v2';
	import {
		aggregateToInterval,
		aggregateToMonth
	} from '$lib/components/charts/v2/dataProcessing.js';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { analyzeUnits } from './unit-analysis.js';
	import { computeEnergyGridlines } from '$lib/components/charts/v2/energy-gridlines.js';
	import { formatXAxis, getDayStartDates } from '$lib/components/charts/v2/formatters.js';
	import chroma from 'chroma-js';
	import { untrack } from 'svelte';
	import { setFacilityFinancialDataContext } from './FacilityFinancialDataContext.svelte.js';

	const PRICE_LINE_COLOUR = '#e63946';

	/**
	 * @param {string} ftCode
	 * @returns {string}
	 */
	function getFuelTechColor(ftCode) {
		return fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (ftCode)] || '#888888';
	}

	/**
	 * @typedef {Object} SummaryData
	 * @property {any[]} mvData
	 * @property {any[]} energyData
	 * @property {string[]} mvSeriesNames
	 * @property {string[]} energySeriesNames
	 * @property {import('$lib/components/charts/v2/ChartStore.svelte.js').default} mvChartStore
	 */

	/**
	 * @typedef {Object} Props
	 * @property {any} facility
	 * @property {string} timeZone
	 * @property {string} [interval]
	 * @property {string} [displayInterval]
	 * @property {number} viewStart
	 * @property {number} viewEnd
	 * @property {string} [priceChartHeight]
	 * @property {string} [mvChartHeight]
	 * @property {boolean} [active] - When false, skip manager instantiation (no fetch fires).
	 * @property {number | undefined} [hoverTime] - External hover time for cross-chart sync.
	 * @property {((time: number | undefined) => void)} [onhoverchange] - Called when a financial chart's local hover changes.
	 * @property {((data: SummaryData) => void)} [onsummarydata]
	 * @property {((range: { start: number, end: number }) => void)} [onviewportchange]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let {
		facility,
		timeZone,
		interval = '5m',
		displayInterval = '30m',
		viewStart,
		viewEnd,
		priceChartHeight = 'h-[150px]',
		mvChartHeight = 'h-[200px]',
		active = true,
		hoverTime = undefined,
		onhoverchange,
		onsummarydata,
		onviewportchange,
		children
	} = $props();

	let ianaTimeZone = $derived(timeZone === '+08:00' ? 'Australia/Perth' : 'Australia/Brisbane');
	let isEnergyInterval = $derived(interval !== '5m');

	// ============================================
	// Unit Analysis
	// ============================================

	let analysis = $derived.by(() => {
		if (!facility) return null;
		return analyzeUnits(facility, getFuelTechColor);
	});

	let unitColours = $derived(analysis?.unitColours ?? {});
	let unitFuelTechMap = $derived(analysis?.unitFuelTechMap ?? {});
	let unitCodeDisplayMap = $derived(analysis?.unitCodeDisplayMap ?? {});
	let unitOrder = $derived(analysis?.unitOrder ?? []);
	let loadIds = $derived(analysis?.loadIds ?? []);

	/**
	 * @param {string} unitCode
	 * @param {string} fuelTech
	 */
	function getLabel(unitCode, fuelTech) {
		const displayCode = unitCodeDisplayMap[unitCode] ?? unitCode;
		return `${displayCode} (${fuelTechNameMap[fuelTech] || fuelTech})`;
	}

	let getMvColour = $derived.by(() => {
		const colourMap = unitColours;
		return (/** @type {string} */ unitCode, /** @type {string} */ fuelTech) => {
			const baseColor = colourMap[unitCode] || getFuelTechColor(fuelTech);
			const isLoad = analysis?.loadIds.includes(`market_value_${unitCode}`) ?? false;
			return isLoad ? chroma(baseColor).brighten(1).hex() : baseColor;
		};
	});

	let getPowerColour = $derived.by(() => {
		const colourMap = unitColours;
		const powerLoadIds = loadIds.map((id) => id.replace('market_value_', 'power_'));
		return (/** @type {string} */ unitCode, /** @type {string} */ fuelTech) => {
			const baseColor = colourMap[unitCode] || getFuelTechColor(fuelTech);
			const isLoad = powerLoadIds.includes(`power_${unitCode}`);
			return isLoad ? chroma(baseColor).brighten(1).hex() : baseColor;
		};
	});

	// ============================================
	// Data Managers — gated by `active`
	// ============================================

	/** @type {ChartDataManager | null} */
	let mvDataManager = $state(null);
	/** @type {ChartDataManager | null} */
	let powerDataManager = $state(null);

	$effect(() => {
		if (!active || !facility) {
			mvDataManager = null;
			return;
		}

		const currentInterval = interval;
		const currentCode = facility.code;
		const networkId = facility.network_id;

		const existing = untrack(() => mvDataManager);
		if (
			existing &&
			existing.facilityCode === currentCode &&
			existing.interval === currentInterval &&
			existing.metric === 'market_value'
		) {
			return;
		}

		const manager = new ChartDataManager({
			facilityCode: currentCode,
			networkId,
			interval: currentInterval,
			metric: 'market_value',
			unitFuelTechMap,
			unitOrder,
			loadsToInvert: loadIds,
			getLabel,
			getColour: getMvColour,
			buildFetchUrl: (params) => {
				params.set('metric', 'power,market_value');
				return `/api/facilities/${currentCode}/power?${params.toString()}`;
			}
		});

		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);
		if (start && end) {
			const duration = end - start;
			const bufferMultiplier = isEnergyInterval ? 3 : 1;
			const buffer = duration * bufferMultiplier;
			manager.requestRange(start - buffer, Math.min(end + buffer, Date.now()), { immediate: true });
		}

		mvDataManager = manager;
	});

	$effect(() => {
		if (!active || !facility) {
			powerDataManager = null;
			return;
		}

		const currentInterval = interval;
		const currentCode = facility.code;
		const networkId = facility.network_id;

		const existing = untrack(() => powerDataManager);
		if (
			existing &&
			existing.facilityCode === currentCode &&
			existing.interval === currentInterval &&
			existing.metric === 'power'
		) {
			return;
		}

		const manager = new ChartDataManager({
			facilityCode: currentCode,
			networkId,
			interval: currentInterval,
			metric: 'power',
			unitFuelTechMap,
			unitOrder,
			loadsToInvert: loadIds.map((id) => id.replace('market_value_', 'power_')),
			getLabel,
			getColour: getPowerColour,
			buildFetchUrl: (params) => {
				params.set('metric', 'power,market_value');
				return `/api/facilities/${currentCode}/power?${params.toString()}`;
			}
		});

		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);
		if (start && end) {
			const duration = end - start;
			const bufferMultiplier = isEnergyInterval ? 3 : 1;
			const buffer = duration * bufferMultiplier;
			manager.requestRange(start - buffer, Math.min(end + buffer, Date.now()), { immediate: true });
		}

		powerDataManager = manager;
	});

	// Fetch data when viewport changes — both managers
	$effect(() => {
		if (!active) return;
		const start = viewStart;
		const end = viewEnd;
		if (!start || !end) return;

		const duration = end - start;
		const bufferMultiplier = isEnergyInterval ? 3 : 1;
		const buffer = duration * bufferMultiplier;
		const bufferedStart = start - buffer;
		const bufferedEnd = Math.min(end + buffer, Date.now());

		mvDataManager?.requestRange(bufferedStart, bufferedEnd);
		powerDataManager?.requestRange(bufferedStart, bufferedEnd);
	});

	// ============================================
	// Visible Data (aggregated)
	// ============================================

	/**
	 * @param {ChartDataManager | null} manager
	 * @param {'sum' | 'mean'} aggMode
	 * @returns {any[]}
	 */
	function getVisibleData(manager, aggMode) {
		if (!manager?.processedCache) return [];

		let data = manager.getDataForRange(viewStart, viewEnd);
		const managerInterval = manager.interval;
		const managerIsEnergyInterval = managerInterval !== '5m';
		const currentDisplayInterval = displayInterval;

		if (
			managerIsEnergyInterval &&
			managerInterval === '1d' &&
			currentDisplayInterval === '1M' &&
			data.length > 0 &&
			manager.seriesMeta
		) {
			data = aggregateToMonth(data, manager.seriesMeta.seriesNames, ianaTimeZone, aggMode);
		}

		if (
			!managerIsEnergyInterval &&
			currentDisplayInterval === '30m' &&
			data.length > 0 &&
			manager.seriesMeta
		) {
			data = aggregateToInterval(data, '30m', manager.seriesMeta.seriesNames, aggMode);
		}

		return data;
	}

	// ============================================
	// Derived Price Data — price = total_market_value / (total_power × interval_hours)
	// ============================================

	/**
	 * @param {string} di
	 * @param {number} [timestampMs]
	 */
	function getIntervalHours(di, timestampMs) {
		switch (di) {
			case '5m':
				return 5 / 60;
			case '30m':
				return 30 / 60;
			case '1h':
				return 1;
			case '1d':
				return 24;
			case '7d':
				return 7 * 24;
			case '1M': {
				if (!timestampMs) return 730;
				const d = new Date(timestampMs);
				const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
				return daysInMonth * 24;
			}
			case '3M':
				return 91.25 * 24;
			case '1y':
				return 365.25 * 24;
			default:
				return 24;
		}
	}

	let priceData = $derived.by(() => {
		if (!mvDataManager?.processedCache || !powerDataManager?.processedCache) return [];

		const mvRows = getVisibleData(mvDataManager, 'sum');
		const powerRows = getVisibleData(powerDataManager, 'mean');
		const mvSeriesNames = mvDataManager.seriesMeta?.seriesNames ?? [];
		const powerSeriesNames = powerDataManager.seriesMeta?.seriesNames ?? [];
		const di = displayInterval;

		/** @type {Map<number, number>} */
		const powerMap = new Map();
		for (const row of powerRows) {
			let total = 0;
			for (const key of powerSeriesNames) {
				const v = row[key];
				if (typeof v === 'number' && !isNaN(v)) total += v;
			}
			powerMap.set(row.time, total);
		}

		return mvRows.map((row) => {
			let mvTotal = 0;
			for (const key of mvSeriesNames) {
				const v = row[key];
				if (typeof v === 'number' && !isNaN(v)) mvTotal += v;
			}
			const powerTotal = powerMap.get(row.time) ?? 0;
			const intervalHrs = getIntervalHours(di, row.time);
			const energy = powerTotal * intervalHrs;
			return {
				date: row.date,
				time: row.time,
				price: energy > 0 ? mvTotal / energy : null
			};
		});
	});

	// ============================================
	// Summary data callback
	// ============================================

	$effect(() => {
		if (!onsummarydata) return;
		if (!mvDataManager?.processedCache || !powerDataManager?.processedCache || !mvChartStore)
			return;

		const mvRows = getVisibleData(mvDataManager, 'sum');
		const powerRows = getVisibleData(powerDataManager, 'mean');
		const powerSeriesNames = powerDataManager.seriesMeta?.seriesNames ?? [];
		const di = displayInterval;

		const energyRows = powerRows.map((row) => {
			const intervalHrs = getIntervalHours(di, row.time);
			/** @type {Record<string, any>} */
			const energyRow = { date: row.date, time: row.time };
			for (const key of powerSeriesNames) {
				const energyKey = key.replace('power_', 'energy_');
				const v = row[key];
				energyRow[energyKey] = typeof v === 'number' ? v * intervalHrs : v;
			}
			return energyRow;
		});
		const energySeriesNames = powerSeriesNames.map((k) => k.replace('power_', 'energy_'));

		onsummarydata({
			mvData: mvRows,
			energyData: energyRows,
			mvSeriesNames: mvDataManager.seriesMeta?.seriesNames ?? [],
			energySeriesNames,
			mvChartStore
		});
	});

	// ============================================
	// Price Chart Store (line chart)
	// ============================================

	let priceChartStore = $derived.by(() => {
		if (!facility) return null;

		const chart = new ChartStore({
			key: Symbol('facility-price-chart'),
			title: 'Price',
			prefix: '',
			displayPrefix: '',
			baseUnit: '$/MWh',
			chartType: 'line',
			timeZone: timeZone
		});

		chart.chartStyles.chartHeightClasses = priceChartHeight;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.hideDataOptions = true;
		chart.hideChartTypeOptions = true;
		chart.useFormatY = true;
		chart.formatY = (/** @type {number} */ d) => '$' + dollarFormatter.format(d);

		return chart;
	});

	$effect(() => {
		if (!priceChartStore) return;

		priceChartStore.seriesNames = ['price'];
		priceChartStore.seriesColours = { price: PRICE_LINE_COLOUR };
		priceChartStore.seriesLabels = { price: 'Av. Price ($/MWh)' };
		priceChartStore.seriesData = priceData;
		priceChartStore.xDomain = /** @type {[number, number]} */ ([viewStart, viewEnd]);
		priceChartStore.chartOptions.selectedCurveType = /** @type {any} */ (
			isEnergyInterval ? 'step' : 'straight'
		);

		if (isEnergyInterval && priceData.length > 1) {
			const g = computeEnergyGridlines(priceData, viewStart, viewEnd, ianaTimeZone);
			priceChartStore.xGridlineTicks = g.gridlineTicks;
			priceChartStore.xTicks = g.ticks;
			priceChartStore.formatTickX = g.formatTick;
		} else if (priceData.length > 0) {
			const dayStarts = getDayStartDates(priceData, ianaTimeZone, timeZone);
			priceChartStore.xTicks = dayStarts;
			priceChartStore.xGridlineTicks = dayStarts;
			priceChartStore.formatTickX = (/** @type {any} */ d) => formatXAxis(d, ianaTimeZone);
		}
	});

	// ============================================
	// Market Value Chart Store (stacked area)
	// ============================================

	let mvChartStore = $derived.by(() => {
		if (!facility) return null;

		const chart = new ChartStore({
			key: Symbol('facility-market-value-chart'),
			title: 'Market Value',
			prefix: '',
			displayPrefix: 'k',
			baseUnit: '$',
			chartType: 'stacked-area',
			timeZone: timeZone
		});

		chart.chartStyles.chartHeightClasses = mvChartHeight;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.useFormatY = true;
		chart.formatY = (/** @type {number} */ d) => {
			const converted = chart.convertAndFormatValue(d);
			return '$' + converted + chart.chartOptions.displayPrefix;
		};

		return chart;
	});

	$effect(() => {
		if (!mvChartStore || !mvDataManager?.processedCache) return;

		const processed = mvDataManager.processedCache;
		mvChartStore.seriesNames = processed.seriesNames;
		mvChartStore.seriesColours = processed.seriesColours;
		mvChartStore.seriesLabels = processed.seriesLabels;
	});

	$effect(() => {
		if (!mvChartStore || !mvDataManager?.processedCache) return;

		const visibleData = getVisibleData(mvDataManager, 'sum');

		mvChartStore.seriesData = visibleData;
		mvChartStore.xDomain = /** @type {[number, number]} */ ([viewStart, viewEnd]);
		mvChartStore.chartOptions.selectedCurveType = /** @type {any} */ (
			isEnergyInterval ? 'step' : 'straight'
		);

		if (isEnergyInterval && visibleData.length > 1) {
			const g = computeEnergyGridlines(visibleData, viewStart, viewEnd, ianaTimeZone);
			mvChartStore.xGridlineTicks = g.gridlineTicks;
			mvChartStore.xTicks = g.ticks;
			mvChartStore.formatTickX = g.formatTick;
		} else if (visibleData.length > 0) {
			const dayStarts = getDayStartDates(visibleData, ianaTimeZone, timeZone);
			mvChartStore.xTicks = dayStarts;
			mvChartStore.xGridlineTicks = dayStarts;
			mvChartStore.formatTickX = (/** @type {any} */ d) => formatXAxis(d, ianaTimeZone);
		}
	});

	// ============================================
	// Pan / Zoom / Wheel Handlers
	// ============================================

	let lastPanDelta = 0;

	function handlePanStart() {
		priceChartStore?.clearHover();
		mvChartStore?.clearHover();
	}

	/** @param {number} deltaMs */
	function handlePan(deltaMs) {
		let newStart = viewStart - deltaMs;
		let newEnd = viewEnd - deltaMs;

		const now = Date.now();
		if (newEnd > now) {
			newEnd = now;
			newStart = now - (viewEnd - viewStart);
		}

		lastPanDelta = deltaMs;
		onviewportchange?.({ start: newStart, end: newEnd });
	}

	function handlePanEnd() {
		const duration = viewEnd - viewStart;
		const bufferMultiplier = isEnergyInterval ? 3 : 1;
		const prefetch = duration * bufferMultiplier;
		const now = Date.now();

		if (lastPanDelta < 0 && viewEnd < now) {
			mvDataManager?.requestRange(viewEnd, Math.min(viewEnd + prefetch, now));
			powerDataManager?.requestRange(viewEnd, Math.min(viewEnd + prefetch, now));
		} else if (lastPanDelta > 0) {
			mvDataManager?.requestRange(viewStart - prefetch, viewStart);
			powerDataManager?.requestRange(viewStart - prefetch, viewStart);
		}
	}

	/**
	 * @param {number} factor
	 * @param {number} centerMs
	 */
	function handleZoom(factor, centerMs) {
		const duration = viewEnd - viewStart;
		const newDuration = duration / factor;

		const ratio = (centerMs - viewStart) / duration;
		let newStart = centerMs - ratio * newDuration;
		let newEnd = newStart + newDuration;

		const now = Date.now();
		if (newEnd > now) {
			newEnd = now;
			newStart = now - newDuration;
		}

		onviewportchange?.({ start: newStart, end: newEnd });
	}

	// Wheel zoom / pan is handled by `InteractionLayer` inside StratumChart —
	// it fires our existing onpan/onzoom callbacks directly.

	// ============================================
	// Loading overlay state
	// ============================================

	let showLoadingOverlay = $derived.by(() => {
		if (!mvDataManager || !mvChartStore) return false;
		if (mvChartStore.seriesData.length > 0) return false;
		return (
			!mvDataManager.initialLoadComplete || mvDataManager.isLoading || mvDataManager.hasPendingFetch
		);
	});

	// ============================================
	// Tooltip formatting
	// ============================================

	const dollarFormatter = getNumberFormat(0);

	let tooltipDateFormatter = $derived(
		new Intl.DateTimeFormat('en-AU', {
			timeZone: ianaTimeZone,
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		})
	);

	/**
	 * @param {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 * @param {number} value
	 */
	function formatDollarValue(chart, value) {
		return '$' + chart.convertAndFormatValue(value) + chart.chartOptions.displayPrefix;
	}

	/** @param {number} value */
	function formatPriceValue(value) {
		return '$' + dollarFormatter.format(value);
	}

	/**
	 * @param {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 */
	function getTooltipData(chart) {
		const data = chart.hoverData || chart.focusData;
		if (!data) return null;

		const key = chart.chartTooltips.valueKey || chart.hoverKey;
		const value = data && key !== undefined ? data[key] : undefined;
		const total = chart.visibleSeriesNames.reduce(
			(sum, name) => sum + (Number(data[name]) || 0),
			0
		);

		return {
			data,
			key,
			value: value !== undefined ? Number(value) : undefined,
			total,
			label: key ? chart.seriesLabels[key] : undefined,
			colour: key ? chart.seriesColours[key] : undefined,
			date: data.date ? tooltipDateFormatter.format(data.date) : ''
		};
	}

	// ============================================
	// Publish context (getters preserve reactivity across consumers)
	// ============================================

	setFacilityFinancialDataContext({
		get priceChartStore() {
			return priceChartStore;
		},
		get mvChartStore() {
			return mvChartStore;
		},
		get priceLoadingRanges() {
			return [...(mvDataManager?.loadingRanges ?? []), ...(powerDataManager?.loadingRanges ?? [])];
		},
		get mvLoadingRanges() {
			return mvDataManager?.loadingRanges ?? [];
		},
		get showLoadingOverlay() {
			return showLoadingOverlay;
		},
		get timeZone() {
			return timeZone;
		},
		get viewStart() {
			return viewStart;
		},
		get viewEnd() {
			return viewEnd;
		},
		get hasViewportHandler() {
			return !!onviewportchange;
		},
		get hoverTime() {
			return hoverTime;
		},
		get onhoverchange() {
			return onhoverchange;
		},
		handlePanStart,
		handlePan,
		handlePanEnd,
		handleZoom,
		getTooltipData,
		formatPriceValue,
		formatDollarValue
	});
</script>

{#if children}
	{@render children()}
{/if}
