<script>
	/**
	 * FacilityPriceChart - Financial charts for a facility
	 *
	 * Renders two charts that follow the parent FacilityChart's viewport:
	 * 1. Derived Price ($/MWh) line chart — total_market_value / total_energy per timestamp
	 * 2. Market Value ($) stacked area chart — per-unit breakdown
	 *
	 * Fetches both energy and market_value data independently via two ChartDataManagers.
	 */

	import {
		ChartStore,
		StratumChart
	} from '$lib/components/charts/v2';
	import { aggregateToInterval, aggregateToMonth } from '$lib/components/charts/v2/dataProcessing.js';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { analyzeUnits } from './unit-analysis.js';
	import { computeEnergyGridlines } from '$lib/components/charts/v2/energy-gridlines.js';
	import { formatXAxis, getDayStartDates } from '$lib/components/charts/v2/formatters.js';
	import chroma from 'chroma-js';
	import { untrack } from 'svelte';

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
	 * @property {any[]} mvData - Visible market_value rows
	 * @property {any[]} energyData - Visible energy rows
	 * @property {string[]} mvSeriesNames - Market value series keys
	 * @property {string[]} energySeriesNames - Energy series keys
	 * @property {import('$lib/components/charts/v2/ChartStore.svelte.js').default} mvChartStore - Market value chart store
	 */

	/**
	 * @typedef {Object} Props
	 * @property {any} facility - Facility object with units array
	 * @property {string} timeZone - Timezone offset string (+10:00 or +08:00)
	 * @property {string} [interval] - API interval (5m, 1d, 1M)
	 * @property {string} [displayInterval] - Display interval for aggregation
	 * @property {number} viewStart - Viewport start (ms) from parent chart
	 * @property {number} viewEnd - Viewport end (ms) from parent chart
	 * @property {string} [priceChartHeight] - Price chart height class
	 * @property {string} [mvChartHeight] - Market value chart height class
	 * @property {((data: SummaryData) => void)} [onsummarydata] - Callback with visible data for summary table
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
		onsummarydata
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
	 * @returns {string}
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

	let getEnergyColour = $derived.by(() => {
		const colourMap = unitColours;
		return (/** @type {string} */ unitCode, /** @type {string} */ fuelTech) => {
			const baseColor = colourMap[unitCode] || getFuelTechColor(fuelTech);
			const isLoad = analysis?.loadIds.includes(`energy_${unitCode}`) ?? false;
			return isLoad ? chroma(baseColor).brighten(1).hex() : baseColor;
		};
	});

	// ============================================
	// Data Manager — Market Value
	// ============================================

	/** @type {ChartDataManager | null} */
	let mvDataManager = $state(null);

	$effect(() => {
		if (!facility) {
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
			getColour: getMvColour
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

	// ============================================
	// Data Manager — Energy (for price derivation)
	// ============================================

	/** @type {ChartDataManager | null} */
	let energyDataManager = $state(null);

	$effect(() => {
		if (!facility) {
			energyDataManager = null;
			return;
		}

		const currentInterval = interval;
		const currentCode = facility.code;
		const networkId = facility.network_id;

		const existing = untrack(() => energyDataManager);
		if (
			existing &&
			existing.facilityCode === currentCode &&
			existing.interval === currentInterval &&
			existing.metric === 'energy'
		) {
			return;
		}

		const manager = new ChartDataManager({
			facilityCode: currentCode,
			networkId,
			interval: currentInterval,
			metric: 'energy',
			unitFuelTechMap,
			unitOrder,
			loadsToInvert: loadIds.map((id) => id.replace('market_value_', 'energy_')),
			getLabel,
			getColour: getEnergyColour
		});

		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);
		if (start && end) {
			const duration = end - start;
			const bufferMultiplier = isEnergyInterval ? 3 : 1;
			const buffer = duration * bufferMultiplier;
			manager.requestRange(start - buffer, Math.min(end + buffer, Date.now()), { immediate: true });
		}

		energyDataManager = manager;
	});

	// Fetch data when viewport changes — both managers
	$effect(() => {
		const start = viewStart;
		const end = viewEnd;
		if (!start || !end) return;

		const duration = end - start;
		const bufferMultiplier = isEnergyInterval ? 3 : 1;
		const buffer = duration * bufferMultiplier;
		const bufferedStart = start - buffer;
		const bufferedEnd = Math.min(end + buffer, Date.now());

		mvDataManager?.requestRange(bufferedStart, bufferedEnd);
		energyDataManager?.requestRange(bufferedStart, bufferedEnd);
	});

	// ============================================
	// Visible Data (aggregated)
	// ============================================

	/**
	 * Get visible, aggregated data for a data manager
	 * @param {ChartDataManager | null} manager
	 * @param {'sum' | 'mean'} aggMode
	 * @returns {any[]}
	 */
	function getVisibleData(manager, aggMode) {
		if (!manager?.processedCache) return [];

		let data = manager.getDataForRange(viewStart, viewEnd);
		const apiInterval = interval;
		const currentDisplayInterval = displayInterval;

		if (isEnergyInterval && apiInterval === '1d' && currentDisplayInterval === '1M' && data.length > 0 && manager.seriesMeta) {
			data = aggregateToMonth(data, manager.seriesMeta.seriesNames, ianaTimeZone, aggMode);
		}

		if (!isEnergyInterval && currentDisplayInterval === '30m' && data.length > 0 && manager.seriesMeta) {
			data = aggregateToInterval(data, '30m', manager.seriesMeta.seriesNames, aggMode);
		}

		return data;
	}

	// ============================================
	// Derived Price Data
	// ============================================

	let priceData = $derived.by(() => {
		if (!mvDataManager?.processedCache || !energyDataManager?.processedCache) return [];

		const mvRows = getVisibleData(mvDataManager, 'sum');
		const energyRows = getVisibleData(energyDataManager, 'sum');
		const mvSeriesNames = mvDataManager.seriesMeta?.seriesNames ?? [];
		const energySeriesNames = energyDataManager.seriesMeta?.seriesNames ?? [];

		// Build timestamp → energy total map
		/** @type {Map<number, number>} */
		const energyMap = new Map();
		for (const row of energyRows) {
			let total = 0;
			for (const key of energySeriesNames) {
				const v = row[key];
				if (typeof v === 'number' && !isNaN(v)) total += v;
			}
			energyMap.set(row.time, total);
		}

		// Derive price per timestamp
		return mvRows.map((row) => {
			let mvTotal = 0;
			for (const key of mvSeriesNames) {
				const v = row[key];
				if (typeof v === 'number' && !isNaN(v)) mvTotal += v;
			}
			const energyTotal = energyMap.get(row.time) ?? 0;
			return {
				date: row.date,
				time: row.time,
				price: energyTotal > 0 ? mvTotal / energyTotal : null
			};
		});
	});

	// ============================================
	// Fire summary data callback
	// ============================================

	$effect(() => {
		if (!onsummarydata) return;
		if (!mvDataManager?.processedCache || !energyDataManager?.processedCache || !mvChartStore) return;

		const mvRows = getVisibleData(mvDataManager, 'sum');
		const energyRows = getVisibleData(energyDataManager, 'sum');

		onsummarydata({
			mvData: mvRows,
			energyData: energyRows,
			mvSeriesNames: mvDataManager.seriesMeta?.seriesNames ?? [],
			energySeriesNames: energyDataManager.seriesMeta?.seriesNames ?? [],
			mvChartStore
		});
	});

	// ============================================
	// Price Chart Store (line chart)
	// ============================================

	/** @type {import('$lib/components/charts/v2/ChartStore.svelte.js').default | null} */
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

	// Update price chart data
	$effect(() => {
		if (!priceChartStore) return;

		priceChartStore.seriesNames = ['price'];
		priceChartStore.seriesColours = { price: PRICE_LINE_COLOUR };
		priceChartStore.seriesLabels = { price: 'Av. Price ($/MWh)' };
		priceChartStore.seriesData = priceData;
		priceChartStore.xDomain = /** @type {[number, number]} */ ([viewStart, viewEnd]);
		priceChartStore.chartOptions.selectedCurveType = /** @type {any} */ (isEnergyInterval ? 'step' : 'straight');

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

	/** @type {import('$lib/components/charts/v2/ChartStore.svelte.js').default | null} */
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

	// Update MV series metadata
	$effect(() => {
		if (!mvChartStore || !mvDataManager?.processedCache) return;

		const processed = mvDataManager.processedCache;
		mvChartStore.seriesNames = processed.seriesNames;
		mvChartStore.seriesColours = processed.seriesColours;
		mvChartStore.seriesLabels = processed.seriesLabels;
	});

	// Update MV chart data/domain
	$effect(() => {
		if (!mvChartStore || !mvDataManager?.processedCache) return;

		const visibleData = getVisibleData(mvDataManager, 'sum');

		mvChartStore.seriesData = visibleData;
		mvChartStore.xDomain = /** @type {[number, number]} */ ([viewStart, viewEnd]);
		mvChartStore.chartOptions.selectedCurveType = /** @type {any} */ (isEnergyInterval ? 'step' : 'straight');

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
	// Hover Handlers
	// ============================================

	/**
	 * @param {number} time
	 * @param {string} [key]
	 */
	function handlePriceHover(time, key) {
		priceChartStore?.setHover(time, key);
	}

	function handlePriceHoverEnd() {
		priceChartStore?.clearHover();
	}

	/** @param {number} time */
	function handlePriceFocus(time) {
		priceChartStore?.toggleFocus(time);
	}

	/**
	 * @param {number} time
	 * @param {string} [key]
	 */
	function handleMvHover(time, key) {
		mvChartStore?.setHover(time, key);
	}

	function handleMvHoverEnd() {
		mvChartStore?.clearHover();
	}

	/** @param {number} time */
	function handleMvFocus(time) {
		mvChartStore?.toggleFocus(time);
	}

	// ============================================
	// Loading State
	// ============================================

	let showLoadingOverlay = $derived.by(() => {
		if (!mvDataManager || !mvChartStore) return false;
		if (mvChartStore.seriesData.length > 0) return false;
		return !mvDataManager.initialLoadComplete || mvDataManager.isLoading || mvDataManager.hasPendingFetch;
	});

	// ============================================
	// Tooltip Formatting
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
	 * Format a dollar value with $ prefix and k suffix (uses chart SI conversion)
	 * e.g. 123456 → "$123k"
	 * @param {import('$lib/components/charts/v2/ChartStore.svelte.js').default} chart
	 * @param {number} value
	 * @returns {string}
	 */
	function formatDollarValue(chart, value) {
		return '$' + chart.convertAndFormatValue(value) + chart.chartOptions.displayPrefix;
	}

	/**
	 * Format a price value with $ prefix
	 * e.g. 87.5 → "$88"
	 * @param {number} value
	 * @returns {string}
	 */
	function formatPriceValue(value) {
		return '$' + dollarFormatter.format(value);
	}

	/**
	 * Get tooltip data for a chart store
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
</script>

{#if priceChartStore && mvChartStore}
	<div class="space-y-4">
		<!-- Derived Price Chart -->
		<div class="border border-light-warm-grey rounded-lg p-4 relative">
			<StratumChart
				chart={priceChartStore}
				onhover={handlePriceHover}
				onhoverend={handlePriceHoverEnd}
				onfocus={handlePriceFocus}
				enablePan={false}
				viewDomain={null}
				loadingRanges={[
					...(mvDataManager?.loadingRanges ?? []),
					...(energyDataManager?.loadingRanges ?? [])
				]}
			>
				{#snippet tooltip()}
					{@const tip = getTooltipData(priceChartStore)}
					<div class="h-[21px]">
						{#if tip}
							<div class="h-full flex items-center justify-end text-xs">
								<span class="px-3 py-1 font-light bg-white/40">{tip.date}</span>
								<div class="bg-light-warm-grey px-4 py-1 flex gap-4 items-center">
									<span class="text-mid-grey">Av. Price</span>
									<strong class="font-semibold">{formatPriceValue(tip.total)}/MWh</strong>
								</div>
							</div>
						{/if}
					</div>
				{/snippet}
			</StratumChart>
		</div>

		<!-- Market Value Chart -->
		<div class="border border-light-warm-grey rounded-lg p-4 relative">
			<StratumChart
				chart={mvChartStore}
				onhover={handleMvHover}
				onhoverend={handleMvHoverEnd}
				onfocus={handleMvFocus}
				enablePan={false}
				viewDomain={null}
				loadingRanges={mvDataManager?.loadingRanges ?? []}
			>
				{#snippet tooltip()}
					{@const tip = getTooltipData(mvChartStore)}
					<div class="h-[21px]">
						{#if tip}
							<div class="h-full flex items-center justify-end text-xs">
								<span class="px-3 py-1 font-light bg-white/40">{tip.date}</span>
								<div class="bg-light-warm-grey px-4 py-1 flex gap-4 items-center">
									{#if tip.value !== undefined && tip.key}
										<div class="flex items-center gap-2">
											<span class="w-2.5 h-2.5 rounded-sm" style="background-color: {tip.colour}"></span>
											<span class="text-mid-grey">{tip.label}</span>
											<strong class="font-semibold">{formatDollarValue(mvChartStore, tip.value)}</strong>
										</div>
									{/if}
									{#if mvChartStore.chartTooltips.showTotal}
										<span class="flex items-center gap-2">
											<span class="text-mid-grey">Total</span>
											<strong class="font-semibold">{formatDollarValue(mvChartStore, tip.total)}</strong>
										</span>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				{/snippet}
			</StratumChart>

			{#if showLoadingOverlay}
				<div class="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
					<div class="flex items-center gap-3 text-mid-warm-grey">
						<svg
							class="animate-spin h-4 w-4"
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
						<span class="text-xs">Loading financial data...</span>
					</div>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<div
		class="border border-light-warm-grey rounded-lg bg-light-warm-grey/30 flex items-center justify-center {mvChartHeight}"
	>
		<span class="text-xs text-mid-warm-grey">Loading...</span>
	</div>
{/if}
