<script>
	/**
	 * FacilityEmissionsDataProvider — owns the shared state for the facility
	 * emissions charts (Intensity line + Emissions Volume stacked area). Two
	 * sibling components (`FacilityEmissionsIntensityChart`,
	 * `FacilityEmissionsVolumeChart`) render from the context this provider sets
	 * up, so a single data fetch powers both. The combined fetch URL
	 * (`metric=<basis>,market_value,emissions`, where `<basis>` is `energy` for
	 * energy intervals and `power` for 5m/30m) is identical to the one used by
	 * `FacilityFinancialDataProvider`, so all four data managers across the two
	 * providers collapse to one network round-trip per range.
	 *
	 * When `active` is false, no data managers are created and no fetches fire
	 * — safe to always wrap even when emissions charts are hidden.
	 */

	import { ChartStore } from '$lib/components/charts/v2';
	import { aggregateForDisplay } from '$lib/components/charts/v2/dataProcessing.js';
	import ChartDataManager from '$lib/components/charts/v2/ChartDataManager.svelte.js';
	import { fuelTechColourMap } from '$lib/theme/openelectricity';
	import { fuelTechNameMap } from '$lib/fuel_techs';
	import { getNumberFormat } from '$lib/utils/formatters';
	import { analyzeUnits } from './unit-analysis.js';
	import { applyFacilityTimeAxis } from '$lib/components/charts/v2/formatters.js';
	import chroma from 'chroma-js';
	import { untrack } from 'svelte';
	import { setFacilityEmissionsDataContext } from './FacilityEmissionsDataContext.svelte.js';
	import {
		getBasisMetric,
		combinedMetricsFor,
		buildCombinedMetricsUrl,
		rewriteSeriesPrefix,
		sumSeries,
		buildEnergyMap,
		createBasisColour
	} from './energy-basis.js';
	import { LINE_COLOUR } from './colours.js';

	/**
	 * @param {string} ftCode
	 * @returns {string}
	 */
	function getFuelTechColor(ftCode) {
		return fuelTechColourMap[/** @type {keyof typeof fuelTechColourMap} */ (ftCode)] || '#888888';
	}

	/**
	 * @typedef {Object} Props
	 * @property {any} facility
	 * @property {string} timeZone
	 * @property {string} [interval]
	 * @property {string} [displayInterval]
	 * @property {number} viewStart
	 * @property {number} viewEnd
	 * @property {string} [intensityChartHeight]
	 * @property {string} [emissionsVolumeChartHeight]
	 * @property {boolean} [active] - When false, skip manager instantiation (no fetch fires).
	 * @property {boolean} [showTooltipDate] - Whether the tooltips show their date/time header (default: true).
	 * @property {number | undefined} [hoverTime] - External hover time for cross-chart sync.
	 * @property {((time: number | undefined) => void)} [onhoverchange] - Called when an emissions chart's local hover changes.
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
		intensityChartHeight = 'h-[200px]',
		emissionsVolumeChartHeight = 'h-[200px]',
		active = true,
		showTooltipDate = true,
		hoverTime = undefined,
		onhoverchange,
		onviewportchange,
		children
	} = $props();

	let ianaTimeZone = $derived(timeZone === '+08:00' ? 'Australia/Perth' : 'Australia/Brisbane');
	let isEnergyInterval = $derived(interval !== '5m');

	// Intensity = emissions / energy. For energy intervals the API serves `energy`
	// (MWh) natively; the 5m/30m power grains derive it from power × hours.
	// See energy-basis.js for the shared rules.
	let basisMetric = $derived(getBasisMetric(interval));
	let combinedMetrics = $derived(combinedMetricsFor(basisMetric));

	// Mirror the tooltip date toggle into both chart stores.
	$effect(() => {
		if (intensityChartStore) intensityChartStore.chartTooltips.showDate = showTooltipDate;
		if (emissionsVolumeChartStore)
			emissionsVolumeChartStore.chartTooltips.showDate = showTooltipDate;
	});

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

	let getEmissionsColour = $derived.by(() => {
		const colourMap = unitColours;
		const emissionsLoadIds = loadIds.map((/** @type {string} */ id) =>
			id.replace(/^power_/, 'emissions_')
		);
		return (/** @type {string} */ unitCode, /** @type {string} */ fuelTech) => {
			const baseColor = colourMap[unitCode] || getFuelTechColor(fuelTech);
			const isLoad = emissionsLoadIds.includes(`emissions_${unitCode}`);
			return isLoad ? chroma(baseColor).brighten(1).hex() : baseColor;
		};
	});

	let getBasisColour = $derived.by(() =>
		createBasisColour({ basisMetric, unitColours, loadIds, getFuelTechColor })
	);

	// ============================================
	// Data Managers — gated by `active`
	// ============================================

	/** @type {ChartDataManager | null} */
	let emissionsDataManager = $state(null);
	/** Denominator basis: energy (MWh) for energy intervals, power (MW) for 5m/30m. */
	/** @type {ChartDataManager | null} */
	let basisDataManager = $state(null);

	$effect(() => {
		if (!active || !facility) {
			emissionsDataManager = null;
			return;
		}

		const currentInterval = interval;
		const currentCode = facility.code;
		const networkId = facility.network_id;

		const existing = untrack(() => emissionsDataManager);
		if (
			existing &&
			existing.facilityCode === currentCode &&
			existing.interval === currentInterval &&
			existing.metric === 'emissions'
		) {
			return;
		}

		// `unitOrder` and `loadIds` from analyzeUnits are `power_…` series IDs.
		// The emissions manager produces `emissions_…` IDs, so rewrite the prefix
		// or processFacilityPower's `unitOrder.filter(...)` falls through to the
		// raw API order and the stack misorders.
		const emissionsUnitOrder = rewriteSeriesPrefix(unitOrder, 'emissions');
		const emissionsLoadsToInvert = rewriteSeriesPrefix(loadIds, 'emissions');

		const metricParam = combinedMetrics;
		const manager = new ChartDataManager({
			facilityCode: currentCode,
			networkId,
			interval: currentInterval,
			metric: 'emissions',
			unitFuelTechMap,
			unitOrder: emissionsUnitOrder,
			loadsToInvert: emissionsLoadsToInvert,
			getLabel,
			getColour: getEmissionsColour,
			// One combined URL shared with the financial provider + generation chart
			// so the API computes all metrics once and the in-flight dedup collapses
			// the managers into a single request.
			buildFetchUrl: buildCombinedMetricsUrl(currentCode, metricParam)
		});

		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);
		if (start && end) {
			const duration = end - start;
			const bufferMultiplier = isEnergyInterval ? 3 : 1;
			const buffer = duration * bufferMultiplier;
			manager.requestRange(start - buffer, Math.min(end + buffer, Date.now()), { immediate: true });
		}

		emissionsDataManager = manager;
	});

	$effect(() => {
		if (!active || !facility) {
			basisDataManager = null;
			return;
		}

		const currentInterval = interval;
		const currentBasis = basisMetric;
		const metricParam = combinedMetrics;
		const currentCode = facility.code;
		const networkId = facility.network_id;

		const existing = untrack(() => basisDataManager);
		if (
			existing &&
			existing.facilityCode === currentCode &&
			existing.interval === currentInterval &&
			existing.metric === currentBasis
		) {
			return;
		}

		// `unitOrder`/`loadIds` are `power_…` IDs; rewrite to the basis prefix so
		// processFacilityPower orders/inverts the right series (`energy_…` for
		// energy intervals).
		const basisUnitOrder = rewriteSeriesPrefix(unitOrder, currentBasis);
		const basisLoadsToInvert = rewriteSeriesPrefix(loadIds, currentBasis);

		const manager = new ChartDataManager({
			facilityCode: currentCode,
			networkId,
			interval: currentInterval,
			metric: currentBasis,
			unitFuelTechMap,
			unitOrder: basisUnitOrder,
			loadsToInvert: basisLoadsToInvert,
			getLabel,
			getColour: getBasisColour,
			// One combined URL shared with the financial provider + generation chart
			// so the API computes all metrics once and the in-flight dedup collapses
			// the managers into a single request.
			buildFetchUrl: buildCombinedMetricsUrl(currentCode, metricParam)
		});

		const start = untrack(() => viewStart);
		const end = untrack(() => viewEnd);
		if (start && end) {
			const duration = end - start;
			const bufferMultiplier = isEnergyInterval ? 3 : 1;
			const buffer = duration * bufferMultiplier;
			manager.requestRange(start - buffer, Math.min(end + buffer, Date.now()), { immediate: true });
		}

		basisDataManager = manager;
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

		emissionsDataManager?.requestRange(bufferedStart, bufferedEnd);
		basisDataManager?.requestRange(bufferedStart, bufferedEnd);
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
		if (!manager?.processedCache || !manager.seriesMeta) return [];

		return aggregateForDisplay(
			manager.getDataForRange(viewStart, viewEnd),
			manager.seriesMeta.seriesNames,
			{
				apiInterval: manager.interval,
				displayInterval,
				ianaTimeZone,
				method: aggMode
			}
		);
	}

	// ============================================
	// Derived Intensity Data — intensity = (total_emissions_tonnes × 1000) / total_energy_MWh
	// (energy is native MWh for energy intervals, power × interval_hours for 5m/30m).
	// Result: kgCO₂e/MWh
	// ============================================

	let intensityData = $derived.by(() => {
		if (!emissionsDataManager?.processedCache || !basisDataManager?.processedCache) return [];

		const emissionsRows = getVisibleData(emissionsDataManager, 'sum');
		// Energy basis sums native MWh; the power basis averages MW (× hours).
		const basisRows = getVisibleData(basisDataManager, isEnergyInterval ? 'sum' : 'mean');
		const emissionsSeriesNames = emissionsDataManager.seriesMeta?.seriesNames ?? [];
		const basisSeriesNames = basisDataManager.seriesMeta?.seriesNames ?? [];

		const energyMap = buildEnergyMap(basisRows, basisSeriesNames, {
			isEnergyInterval,
			displayInterval,
			ianaTimeZone
		});

		return emissionsRows.map((row) => {
			const emissionsTotal = sumSeries(row, emissionsSeriesNames); // tonnes CO₂e
			const energyMWh = energyMap.get(row.time) ?? 0;
			return {
				date: row.date,
				time: row.time,
				// tonnes → kg (×1000), divided by MWh → kgCO₂e/MWh
				intensity: energyMWh > 0 ? (emissionsTotal * 1000) / energyMWh : null
			};
		});
	});

	// ============================================
	// Intensity Chart Store (line chart)
	// ============================================

	let intensityChartStore = $derived.by(() => {
		if (!facility) return null;

		const chart = new ChartStore({
			key: Symbol('facility-emissions-intensity-chart'),
			title: 'Emissions Intensity',
			prefix: '',
			displayPrefix: '',
			baseUnit: 'kgCO₂e/MWh',
			chartType: 'line',
			timeZone: timeZone
		});

		chart.chartStyles.chartHeightClasses = intensityChartHeight;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.chartStyles.snapTicks = true;
		chart.hideDataOptions = true;
		chart.hideChartTypeOptions = true;
		// Single-series line — the floating-tooltip total just repeats the value.
		chart.chartTooltips.showTotal = false;
		chart.useFormatY = true;
		chart.formatY = (/** @type {number} */ d) => intensityFormatter.format(d);

		return chart;
	});

	$effect(() => {
		if (!intensityChartStore) return;

		intensityChartStore.seriesNames = ['intensity'];
		intensityChartStore.seriesColours = { intensity: LINE_COLOUR };
		intensityChartStore.seriesLabels = { intensity: 'Emissions Intensity (kgCO₂e/MWh)' };
		intensityChartStore.seriesData = intensityData;
		intensityChartStore.xDomain = /** @type {[number, number]} */ ([viewStart, viewEnd]);
		intensityChartStore.chartOptions.selectedCurveType = /** @type {any} */ (
			isEnergyInterval ? 'step' : 'straight'
		);

		applyFacilityTimeAxis(intensityChartStore, {
			data: intensityData,
			viewStart,
			viewEnd,
			ianaTimeZone,
			timeZone,
			isEnergy: isEnergyInterval,
			displayInterval
		});
	});

	// ============================================
	// Emissions Volume Chart Store (stacked area)
	// ============================================

	let emissionsVolumeChartStore = $derived.by(() => {
		if (!facility) return null;

		const chart = new ChartStore({
			key: Symbol('facility-emissions-volume-chart'),
			title: 'Emissions',
			prefix: '',
			displayPrefix: '',
			baseUnit: 't',
			chartType: 'stacked-area',
			timeZone: timeZone
		});

		chart.chartStyles.chartHeightClasses = emissionsVolumeChartHeight;
		chart.chartStyles.chartPadding = { top: 0, right: 0, bottom: 20, left: 0 };
		chart.chartStyles.snapTicks = true;
		chart.useFormatY = true;
		chart.formatY = (/** @type {number} */ d) => chart.convertAndFormatValue(d) + ' t';

		return chart;
	});

	$effect(() => {
		if (!emissionsVolumeChartStore || !emissionsDataManager?.processedCache) return;

		const processed = emissionsDataManager.processedCache;
		emissionsVolumeChartStore.seriesNames = processed.seriesNames;
		emissionsVolumeChartStore.seriesColours = processed.seriesColours;
		emissionsVolumeChartStore.seriesLabels = processed.seriesLabels;
	});

	$effect(() => {
		if (!emissionsVolumeChartStore || !emissionsDataManager?.processedCache) return;

		const visibleData = getVisibleData(emissionsDataManager, 'sum');

		emissionsVolumeChartStore.seriesData = visibleData;
		emissionsVolumeChartStore.xDomain = /** @type {[number, number]} */ ([viewStart, viewEnd]);
		emissionsVolumeChartStore.chartOptions.selectedCurveType = /** @type {any} */ (
			isEnergyInterval ? 'step' : 'straight'
		);

		applyFacilityTimeAxis(emissionsVolumeChartStore, {
			data: visibleData,
			viewStart,
			viewEnd,
			ianaTimeZone,
			timeZone,
			isEnergy: isEnergyInterval,
			displayInterval
		});
	});

	// ============================================
	// Pan / Zoom / Wheel Handlers
	// ============================================

	let lastPanDelta = 0;

	function handlePanStart() {
		intensityChartStore?.clearHover();
		emissionsVolumeChartStore?.clearHover();
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
			emissionsDataManager?.requestRange(viewEnd, Math.min(viewEnd + prefetch, now));
			basisDataManager?.requestRange(viewEnd, Math.min(viewEnd + prefetch, now));
		} else if (lastPanDelta > 0) {
			emissionsDataManager?.requestRange(viewStart - prefetch, viewStart);
			basisDataManager?.requestRange(viewStart - prefetch, viewStart);
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
		if (!emissionsDataManager || !emissionsVolumeChartStore) return false;
		if (emissionsVolumeChartStore.seriesData.length > 0) return false;
		return (
			!emissionsDataManager.initialLoadComplete ||
			emissionsDataManager.isLoading ||
			emissionsDataManager.hasPendingFetch
		);
	});

	// ============================================
	// Tooltip formatting
	// ============================================

	const intensityFormatter = getNumberFormat(0);

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
	function formatEmissionsValue(chart, value) {
		return chart.convertAndFormatValue(value) + ' t';
	}

	/** @param {number} value */
	function formatIntensityValue(value) {
		return intensityFormatter.format(value) + ' kgCO₂e/MWh';
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

	setFacilityEmissionsDataContext({
		get intensityChartStore() {
			return intensityChartStore;
		},
		get emissionsVolumeChartStore() {
			return emissionsVolumeChartStore;
		},
		get intensityLoadingRanges() {
			return [
				...(emissionsDataManager?.loadingRanges ?? []),
				...(basisDataManager?.loadingRanges ?? [])
			];
		},
		get emissionsVolumeLoadingRanges() {
			return emissionsDataManager?.loadingRanges ?? [];
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
		formatIntensityValue,
		formatEmissionsValue
	});
</script>

{#if children}
	{@render children()}
{/if}
