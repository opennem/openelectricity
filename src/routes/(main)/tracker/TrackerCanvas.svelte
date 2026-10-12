<script>
	import { getTimeFormatPolicy } from '$lib/components/charts/v2/time-format-policy.js';
	import { onMount, untrack } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import { slide } from 'svelte/transition';
	import TrackerSplitLayout, { FUEL_TECH_SPLIT } from './TrackerSplitLayout.svelte';
	import SwitchTabs from '$lib/components/SwitchTabs.svelte';
	import SeriesLegend from './SeriesLegend.svelte';
	import { seriesLegendItems } from './chart-legend.js';
	import NetworkChart from '$lib/components/charts/network/NetworkChart.svelte';
	import { rangeSlugFor } from '$lib/components/charts/facility/range-params.js';
	import {
		getIntervalSpec,
		isRollingInterval
	} from '$lib/components/charts/facility/range-interval-config.js';
	import { getGroup, loadGroupsFor } from '$lib/components/charts/network/groups.js';
	import {
		bucketFilterKindFor,
		bucketFilterOptionsFor
	} from '$lib/components/charts/v2/bucket-filter.js';
	import { createContributionContext } from '$lib/components/charts/network/contribution.js';
	import { RENEWABLES_SERIES_ID } from '$lib/components/charts/network/market-series-ids.js';
	import { toNetworkDateString } from '$lib/components/charts/v2/network-time.js';
	import { hasSpotPrice, regionLabel } from './tracker-regions.js';
	import ChartCard from '$lib/components/charts/card/ChartCard.svelte';
	import ReadingFreshness from './ReadingFreshness.svelte';
	import FuelTechPanel from './FuelTechPanel.svelte';
	import FuelTechOptions from './FuelTechOptions.svelte';
	import ComparePanel from '$lib/components/charts/card/compare/ComparePanel.svelte';
	import WindowMetrics from './WindowMetrics.svelte';
	import {
		defaultComparePair,
		compareTimeMarkers,
		pickCompareTime,
		toggleCompareCard
	} from '$lib/components/charts/card/compare/chart-compare.js';
	import { timelineCompareSource } from './chart-compare-sources.js';
	import { compareBuckets } from '$lib/components/charts/card/compare/snapshot-sources.js';
	import { createComparePins } from '$lib/components/charts/card/compare/compare-pins.svelte.js';
	import { createTrackerPrefetchPlan } from './tracker-prefetch.js';
	import { createLoadingNotice } from './tracker-loading.svelte.js';
	import { resolvePriceMode, TIMELINE_COMPARE_CARDS } from './tracker-model.js';
	import {
		CURTAILMENT_SERIES,
		curtailmentOverlayFor,
		DEMAND_LINE_COLOUR,
		RENEWABLES_LINE_COLOUR
	} from './tracker-overlays.js';
	import { formatPercentageValue } from './table-format.js';
	import { createTrackerProviders } from './tracker-providers.svelte.js';
	import { createRooftopForecast } from './rooftop-forecast.svelte.js';
	import { hasRooftopForecast } from './rooftop-forecast.js';
	import { createTableColumnsPreference } from './table-columns.svelte.js';
	import { chartTableColumn } from './table-columns.js';
	import { createTrackerTable } from './tracker-table.svelte.js';
	import { createTrackerData } from './tracker-data.svelte.js';
	import { createTrackerMetrics } from './tracker-metrics.svelte.js';
	import { toggleOverlayVisibility, toggleSeriesVisibility } from './tracker-visibility.js';
	import {
		exportFileName,
		timelineDataset,
		timelineSummaryRows,
		trackerFileName
	} from './tracker-export.js';

	/** @typedef {import('./types.js').TrackerOverlay} TrackerOverlay */
	/** @typedef {import('./types.js').GenerationSnapshot} GenerationSnapshot */
	/** @typedef {import('./types.js').TrackerExportContext} TrackerExportContext */
	/** @typedef {import('./types.js').DownloadState} DownloadState */
	/** @type {{session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>,
	 * showMetrics?: boolean}} */
	let { session, showMetrics = true } = $props();
	let pageVisible = $state(true);
	onMount(() => {
		pageVisible = !document.hidden;
	});
	const range = untrack(() => session.range);
	let region = $derived(session.selection.region);
	let group = $derived(session.selection.group);
	const tableColumns = createTableColumnsPreference();
	/** Units picked from the table headers. Session-only: the defaults size
	 * energy to the window, so a pinned unit shouldn't outlive the visit. */
	let tableUnits = $state.raw(/** @type {import('./table-units.js').TableUnits} */ ({}));
	let contributionMode = $derived(session.selection.contributionMode);
	let priceMode = $derived(session.selection.priceMode);
	let emissionsMode = $derived(session.selection.emissionsMode);
	let overlays = $derived(session.selection.overlays);
	let tablePanelOpen = $derived(session.selection.tablePanelOpen);
	let comparison = $derived(session.selection.comparison);
	let bucketFilter = $derived(session.selection.bucketFilter);
	let imageFilterLabel = $derived(
		bucketFilterOptionsFor(bucketFilterKindFor(range.displayInterval))?.find(
			(option) => option.id === bucketFilter
		)?.label
	);
	let timeZone = $derived(session.timeZone);
	let ianaTimeZone = $derived(session.ianaTimeZone);
	let dateStart = $derived(toNetworkDateString(session.anchorStart, timeZone));
	let dateEnd = $derived(toNetworkDateString(session.anchorEnd, timeZone));
	let viewWindow = $derived(session.window);
	let rangeLabel = $derived(session.rangeLabel);
	let generationChart = $state.raw(/** @type {NetworkChart | undefined} */ (undefined));
	let priceChart = $state.raw(/** @type {NetworkChart | undefined} */ (undefined));
	let emissionsChart = $state.raw(/** @type {NetworkChart | undefined} */ (undefined));
	let generationDisplayPrefix = $derived(
		/** @type {SiPrefix} */ (generationChart?.getDisplayPrefix() ?? 'M')
	);
	let showContributions = $derived(session.selection.generationTransform === 'proportion');
	let needsContributionDemand = $derived(contributionMode === 'demand');
	let previewTime = $state(/** @type {number | undefined} */ (undefined));
	/** The one pinned time the charts and the metrics strip share: a click on a
	 * plot or on a strip extreme sets it, and either surface clears it. */
	let focusTime = $state(/** @type {number | undefined} */ (undefined));
	let panZoomEngaged = $state(false);
	let hiddenSeries = $derived(session.selection.hiddenSeries);
	let regionHasSpotPrice = $derived(hasSpotPrice(region));
	let priceIsMarketValue = $derived(resolvePriceMode(region, priceMode) === 'market_value');
	let emissionsIsIntensity = $derived(emissionsMode === 'intensity');
	let energyMetric = $derived(range.activeMetric === 'energy');

	/** @typedef {'generation' | 'market' | 'emissions'} TimelineCard */
	/** The chart card under the pointer, and the series under it on that card:
	 * as on the Profile breakdown, the table outlines the card's column and
	 * highlights the series' row, and the card's border darkens. */
	let hoveredCard = $state(/** @type {TimelineCard | null} */ (null));
	let hoveredSeries = $state(/** @type {string | undefined} */ (undefined));
	/** The hovered card's table column, while the table shows it. */
	let focusColumn = $derived.by(() => {
		if (!hoveredCard) return null;
		const column = chartTableColumn(hoveredCard, {
			energy: energyMetric,
			proportion: session.selection.generationTransform === 'proportion',
			marketValue: priceIsMarketValue,
			intensity: emissionsIsIntensity
		});
		return column && tableColumns.value.includes(column) ? column : null;
	});
	/** @param {TimelineCard} card @param {boolean} hovered */
	function hoverCard(card, hovered) {
		if (hovered) hoveredCard = card;
		else if (hoveredCard === card) hoveredCard = null;
	}
	/** @param {string | undefined} key */
	const hoverSeries = (key) => (hoveredSeries = key);
	let isRollingDisplay = $derived(isRollingInterval(range.displayInterval));
	let intervalBadge = $derived(
		getIntervalSpec(range.displayInterval)?.label ?? range.displayInterval
	);
	let priceMetric = $derived(
		/** @type {'market_value' | 'price' | 'price_vw'} */ (
			priceIsMarketValue ? 'market_value' : isRollingDisplay ? 'price_vw' : 'price'
		)
	);
	let emissionsMetric = $derived(
		/** @type {'emissions_intensity' | 'emissions'} */ (
			emissionsIsIntensity ? 'emissions_intensity' : 'emissions'
		)
	);
	let showDemandLine = $derived(overlays.includes('demand'));
	let showRenewablesLine = $derived(overlays.includes('renewables'));
	let shownCurtailment = $derived(
		CURTAILMENT_SERIES.filter((series) => overlays.includes(series.overlay))
	);
	let shownCurtailmentIds = $derived(shownCurtailment.map((series) => series.id));
	/** @param {import('./types.js').PriceMode} value */
	const onpricemodechange = (value) => session.select('priceMode', value);
	/** @param {import('./types.js').EmissionsMode} value */
	const onemissionsmodechange = (value) => session.select('emissionsMode', value);
	/** @param {TrackerOverlay[]} value */
	const onoverlayschange = (value) => session.select('overlays', value, 'replace');
	/** @param {boolean} value */
	const onpaneltoggle = (value) => session.select('tablePanelOpen', value);
	const providers = createTrackerProviders({
		selection: () => session.selection,
		range,
		timeZone: () => timeZone,
		needsContributionDemand: () => needsContributionDemand,
		needsWindowMetrics: () => showMetrics
	});
	const { marketData, demandData, curtailmentData } = providers;
	/** AEMO's rooftop forecast tops up the lagging rooftop band to the latest
	 *  data time: NEM scopes, absolute power views. */
	let forecastAvailable = $derived(
		hasRooftopForecast(region) && !energyMetric && !showContributions
	);
	/** Only while the timeline follows now; a paused window has no lag to fill. */
	let forecastShown = $derived(
		forecastAvailable && session.selection.rooftopForecast && session.following
	);
	const rooftopForecast = createRooftopForecast({
		region: () => region,
		enabled: () => forecastShown,
		clock: () => session.clockMs,
		timeZone: () => timeZone
	});
	const data = createTrackerData({
		session: untrack(() => session),
		priceMetric: () => priceMetric,
		emissionsMetric: () => emissionsMetric,
		hidden: () => hiddenSeries,
		charts: () => [generationChart, priceChart, emissionsChart]
	});
	const table = createTrackerTable({
		session: untrack(() => session),
		providers,
		generation: () => data.current('generation'),
		queryKey: () => data.queryKey('generation'),
		ready: () => data.ready('generation'),
		hidden: () => hiddenSeries,
		contribution: () => contributionMode,
		ianaTimeZone: () => ianaTimeZone,
		inspectTime: () => hoverTime
	});
	const metrics = createTrackerMetrics({
		session: untrack(() => session),
		data,
		providers,
		table,
		hidden: () => hiddenSeries,
		priceMetric: () => priceMetric,
		holdFrame: () => chartsHoldFrame
	});

	// ---- Compare mode (`chart-compare.js`) ----
	// Any card can compare two of its buckets; the comparing cards share one
	// A and B (URL state), drawn as markers on each. A click on a comparing
	// chart sets the armed slot instead of pinning a time.
	let comparePair = $derived({ a: comparison?.a ?? null, b: comparison?.b ?? null });
	let comparingCards = $derived(comparison?.cards ?? []);
	/** Which slot the next click on a comparing chart sets: page state only. */
	let armed = $state(
		/** @type {import('$lib/components/charts/card/compare/chart-compare.js').CompareSlot} */ ('a')
	);
	let compareMarkers = $derived(compareTimeMarkers(comparePair, armed));
	const comparePins = Object.fromEntries(
		TIMELINE_COMPARE_CARDS.map((card) => [
			card,
			createComparePins({
				identity: () => data.seriesKey(card),
				snapshot: () => data.latest(card),
				pair: () => comparePair
			})
		])
	);
	/** @param {TimelineCard} card */
	function cardMetric(card) {
		return card === 'generation'
			? range.activeMetric
			: card === 'market'
				? priceMetric
				: emissionsMetric;
	}
	/** @param {TimelineCard} card */
	function compareSource(card) {
		return timelineCompareSource(card, data.latest(card), {
			metric: cardMetric(card),
			hidden:
				card === 'generation' ||
				(card === 'market' && priceIsMarketValue) ||
				(card === 'emissions' && !emissionsIsIntensity)
					? hiddenSeries
					: [],
			loadIds: loadGroupsFor(getGroup(group)),
			prefix: generationDisplayPrefix,
			held: comparePins[card].rows,
			region,
			zone: timeZone,
			interval: range.displayInterval,
			formatTime: getTimeFormatPolicy(range.displayInterval, ianaTimeZone).formatTooltip
		});
	}
	/** @param {TimelineCard} card @param {boolean} open */
	function setCompareOpen(card, open) {
		if (open && !comparison) armed = 'a';
		const times = compareBuckets(data.latest(card)).map((row) => row.time);
		session.select(
			'comparison',
			toggleCompareCard(comparison, card, open, defaultComparePair(times))
		);
	}
	/** @param {import('$lib/components/charts/card/compare/chart-compare.js').ComparePair} pair @param {'push' | 'replace'} history */
	function changeComparePair(pair, history) {
		if (comparison) session.select('comparison', { ...comparison, ...pair }, history);
	}
	/** A click (or Enter) on a comparing chart. @param {number | undefined} time */
	function pickCompare(time) {
		if (time === undefined) return;
		const next = pickCompareTime(comparePair, armed, time);
		armed = next.armed;
		changeComparePair(next.pair, 'push');
	}
	/** Pan and zoom the charts to show A and B, keeping the span when it fits. */
	function revealCompare() {
		const times = [comparePair.a, comparePair.b].filter((time) => time !== null);
		if (!times.length) return;
		const low = Math.min(...times);
		const high = Math.max(...times);
		const span = Math.max(viewWindow.end - viewWindow.start, (high - low) * 1.2);
		const centre = (low + high) / 2;
		session.settleViewport({ start: centre - span / 2, end: centre + span / 2 });
	}
	/** The chart props a comparing card swaps in: its clicks pick A / B, and
	 * the shared pin gives way to the markers.
	 * @param {TimelineCard} card */
	function compareChartProps(card) {
		if (!comparingCards.includes(card)) return { timeMarkers: null, engageOnTap: true };
		return {
			focusTime: undefined,
			onfocuschange: pickCompare,
			timeMarkers: compareMarkers,
			engageOnTap: false
		};
	}
	/** `tracker-nem-generation-comparison-2026-10-01-to-2026-10-08.csv`
	 * @param {TimelineCard} card */
	function compareFileName(card) {
		const day = (/** @type {number | null} */ time) => toNetworkDateString(time ?? 0, timeZone);
		return trackerFileName({
			scope: region,
			dataset: `${card}-comparison`,
			range: `${day(comparePair.a)}-to-${day(comparePair.b)}`,
			extension: 'csv'
		});
	}
	let displayRowOpts = $derived(table.displayRowOpts);
	let tableRowIds = $derived(table.rowIds);
	let displayedTable = $derived(table.accepted);
	let tableValuesPending = $derived(table.valuesPending);
	let displayedRows = $derived(table.displayedRows);
	let inspectedTable = $derived(table.inspection);
	const EMPTY_OVERLAYS = /** @type {any[]} */ ([]);
	const PREFETCH_PLAN = createTrackerPrefetchPlan();

	let releasedKey = $state('');
	let switchKey = $derived(`${region}|${group}|${range.activeMetric}|${range.activeInterval}`);
	let chartsHoldFrame = $derived(releasedKey !== switchKey || range.rangeSwitchPending);
	// One loading treatment for the selected window, including table/overlay feeds.
	// Accepted snapshots keep background cache warming from dimming the whole tracker.
	let pendingData = $derived(
		!session.gestureActive &&
			(chartsHoldFrame ||
				(!data.current('generation') && !data.state('generation').error) ||
				(!data.current('market') && !data.state('market').error) ||
				(!data.current('emissions') && !data.state('emissions').error) ||
				providers.pending)
	);
	const loadingNotice = createLoadingNotice(() => pendingData);
	let trackerLoading = $derived(loadingNotice.active);
	/** The navigation and every data surface share this visual loading lifecycle. */
	export function isLoading() {
		return trackerLoading;
	}
	let contributionDemandReady = $derived(!marketData.isPending && !marketData.error);
	/** The feeds the generation chart's percentages and overlays draw from. */
	let overlayProviders = $derived([
		...(needsContributionDemand || (overlays.includes('renewables') && isRollingDisplay)
			? [marketData]
			: []),
		...(overlays.includes('demand') ? [providers.demandData] : []),
		...(overlays.includes('renewables') && !isRollingDisplay ? [providers.shareData] : []),
		...(overlays.some((id) => id.startsWith('curtailment-')) ? [providers.curtailmentData] : [])
	]);
	let imageProvidersReady = $derived(
		overlayProviders.every((provider) => !provider.isPending && !provider.error)
	);
	let contributionDemandRows = $derived(
		needsContributionDemand && contributionDemandReady
			? marketData.getDisplayRows(viewWindow.start, viewWindow.end, displayRowOpts)
			: []
	);
	/** @param {TimeSeriesData[]} rows @param {string[]} names */
	function chartContributionContext(rows, names) {
		return createContributionContext({
			generationRows: rows,
			demandRows: contributionDemandRows,
			seriesNames: names,
			loadSeriesIds: loadGroupsFor(getGroup(group)),
			mode: contributionMode,
			ready: !chartsHoldFrame && (contributionMode === 'generation' || contributionDemandReady)
		});
	}
	$effect(() => {
		if (!data.settled) return;
		releasedKey = switchKey;
		range.settle();
	});
	/** @param {GenerationSnapshot} value */
	const handleGenerationData = (value) => data.publish('generation', value);
	/** Do not advance while the active query or a required provider is still loading.
	 * Failed requests are eligible for the next scheduled attempt. */
	export function isLiveReady() {
		return data.settled && !providers.pending && !session.gestureActive;
	}
	/** @param {GenerationSnapshot} value */
	const handlePriceData = (value) => data.publish('market', value);
	/** @param {GenerationSnapshot} value */
	const handleEmissionsData = (value) => data.publish('emissions', value);

	const reducedMotion = new MediaQuery('(prefers-reduced-motion: reduce)');
	let hoverTime = $derived(previewTime ?? focusTime);
	/** The hovered or keyboard-inspected period, formatted at the display grain.
	 *  The page shows it in place of the range label while inspection lasts. */
	let inspectLabel = $derived(
		hoverTime !== undefined &&
			!session.gestureActive &&
			hoverTime >= viewWindow.start &&
			hoverTime <= viewWindow.end
			? getTimeFormatPolicy(range.displayInterval, ianaTimeZone).formatTooltip(hoverTime)
			: undefined
	);
	export function getInspectLabel() {
		return inspectLabel;
	}
	onMount(() =>
		session.connect(() => [generationChart, priceChart, emissionsChart, ...providers.all])
	);
	let overlayLines = $derived.by(() => {
		if (!showDemandLine && !showRenewablesLine) return EMPTY_OVERLAYS;
		const { start, end } = viewWindow;
		/** @type {any[]} */
		const lines = [];
		if (showDemandLine) {
			lines.push({
				id: 'demand',
				label: 'Demand',
				data: demandData.getDisplayRows(start, end, displayRowOpts),
				valueKey: 'demand',
				colour: DEMAND_LINE_COLOUR,
				scale: 'y'
			});
		}
		if (showRenewablesLine) {
			lines.push({
				id: 'renewable-share',
				label: showContributions ? 'Renewables (% of gross demand)' : 'Renewables',
				data: providers.renewableShareRows(start, end, table.shareRowOpts),
				valueKey: 'renewable_share',
				colour: RENEWABLES_LINE_COLOUR,
				scale: 'percent',
				tooltipUnit: '%',
				formatTooltipValue: formatPercentageValue,
				absoluteTooltipValue: {
					data: marketData.getDisplayRows(start, end, displayRowOpts),
					valueKey: RENEWABLES_SERIES_ID
				}
			});
		}
		return lines;
	});

	/** Hatched curtailment bands riding the generation stack's top. */
	let overlayAreas = $derived.by(() => {
		if (!shownCurtailment.length) return EMPTY_OVERLAYS;
		return [
			{
				id: 'curtailment',
				data: curtailmentData.getDisplayRows(viewWindow.start, viewWindow.end, displayRowOpts),
				series: shownCurtailment.map(({ id, colour, label }) => ({ id, colour, label }))
			}
		];
	});

	let visibility = $derived({ hiddenSeries, overlays, rowIds: tableRowIds });

	// The stacked charts' colour keys, while the fuel-tech table that keys
	// them is closed. Single-line views (price, intensity) need none.
	let generationLegend = $derived(
		tablePanelOpen
			? []
			: seriesLegendItems({
					snapshot: data.current('generation'),
					hidden: hiddenSeries,
					lines: overlayLines,
					areas: overlayAreas
				})
	);
	let marketLegend = $derived(
		tablePanelOpen || !priceIsMarketValue
			? []
			: seriesLegendItems({ snapshot: data.current('market'), hidden: hiddenSeries })
	);
	let emissionsLegend = $derived(
		tablePanelOpen || emissionsIsIntensity
			? []
			: seriesLegendItems({ snapshot: data.current('emissions'), hidden: hiddenSeries })
	);

	/** Solo pushes one history entry; a plain overlay toggle replaces (see README).
	 * @param {TrackerOverlay} overlay @param {boolean} [exclusive] */
	function toggleOverlay(overlay, exclusive = false) {
		const next = toggleOverlayVisibility(visibility, overlay, exclusive);
		if (exclusive) session.selectVisibility(next.hiddenSeries, next.overlays);
		else onoverlayschange?.(next.overlays);
	}

	/** @param {string} id @param {boolean} [exclusive] */
	function toggleCurtailment(id, exclusive = false) {
		const overlay = curtailmentOverlayFor(id);
		if (overlay) toggleOverlay(overlay, exclusive);
	}

	/** @param {string} series @param {boolean} [exclusive] */
	function toggleSeries(series, exclusive = false) {
		const next = toggleSeriesVisibility(visibility, series, exclusive);
		session.selectVisibility(next.hiddenSeries, next.overlays);
	}

	function showAllSeries() {
		session.selectVisibility([]);
	}

	/** @param {number | undefined} time */
	function handleHoverChange(time) {
		previewTime = time;
	}

	/** Everything the three timeline charts share: scope, grain, hover and
	 *  gesture wiring, the held-frame veil and idle prefetch. Each card adds
	 *  its metric, chart kind, transforms and its own viewport/data callbacks.
	 *  `hoverTime` is passed separately: it reads the shared focus time,
	 *  and the strip's inputs read the charts' query state, so folding it into
	 *  one spread object would make that derivation reference itself.
	 */
	let sharedChartProps = $derived(
		/** @type {Pick<import('svelte').ComponentProps<typeof NetworkChart>,
		 * 'region' | 'bucketFilter' | 'interval' | 'displayInterval' | 'group' | 'timeZone' |
		 * 'dateStart' | 'dateEnd' | 'showContainer' | 'tooltipMode' | 'onhoverchange' | 'focusTime' | 'onfocuschange' |
		 * 'onviewportsettle' | 'panZoomMode' | 'gestureActive' | 'ongesturechange' |
		 * 'showLoadingIndicator' | 'holdFrame' | 'prefetchPlan'>} */ ({
			region,
			bucketFilter,
			interval: range.activeInterval,
			displayInterval: range.displayInterval,
			group,
			timeZone,
			dateStart,
			dateEnd,
			showContainer: false,
			tooltipMode: 'strip',
			onhoverchange: handleHoverChange,
			focusTime,
			onfocuschange: (time) => (focusTime = time),
			onviewportsettle: session.settleViewport,
			panZoomMode: 'tap-to-engage',
			gestureActive: session.gestureActive,
			ongesturechange: (active) => (session.gestureActive = active),
			showLoadingIndicator: false,
			holdFrame: chartsHoldFrame,
			prefetchPlan: pageVisible ? PREFETCH_PLAN : null
		})
	);

	/** Where a chart card's download stands. Each card is ready on its own
	 * snapshot (which never describes a stale query), and generation also
	 * waits for the feeds its overlays draw from.
	 * @param {TimelineCard} name @returns {DownloadState} */
	function chartState(name) {
		if (data.state(name).error) return 'error';
		if (
			!data.ready(name) ||
			(name === 'generation' && overlayProviders.some((provider) => provider.isPending))
		)
			return 'loading';
		return data.current(name)?.data.length ? 'ready' : 'empty';
	}

	/** @returns {DownloadState} */
	function tableState() {
		if (data.state('generation').error || table.feedsError) return 'error';
		if (tableValuesPending) return 'loading';
		return displayedRows?.length ? 'ready' : 'empty';
	}
	/** Each card's download. Read lazily, by the open dialog: the state and
	 * data describe the card as it is then.
	 * @param {import('./types.js').ExportDatasetKey} key */
	function downloadFor(key) {
		return {
			get state() {
				return key === 'table' ? tableState() : chartState(key);
			},
			dataset: () => timelineDataset(key, exportContext())
		};
	}

	/** The workbook's Summary rows. */
	export function downloadSummary() {
		return timelineSummaryRows(exportContext());
	}
	/** `tracker-nem-generation-3d.csv`, or `tracker-nem-3d.xlsx` for the workbook.
	 * @param {string | null} id @param {'csv' | 'xlsx'} extension */
	export function downloadFileName(id, extension) {
		return exportFileName(
			{ region, rangeSlug: rangeSlugFor(range) },
			extension === 'xlsx' ? 'xlsx' : (id ?? '')
		);
	}
	/** Everything the downloads read, at the moment one is built.
	 * @returns {TrackerExportContext} */
	function exportContext() {
		return {
			region,
			regionLabel: regionLabel(region),
			group,
			groupLabel: getGroup(group).label,
			contributionMode,
			basis: range.activeMetric,
			displayInterval: range.displayInterval,
			intervalLabel: intervalBadge,
			rangeLabel,
			rangeSlug: rangeSlugFor(range),
			timeZone,
			window: viewWindow,
			priceMetric,
			emissionsMetric,
			generation: data.current('generation'),
			price: data.current('market'),
			emissions: data.current('emissions'),
			tableRows: tableValuesPending ? null : displayedRows,
			curtailmentRows: displayedTable?.curtailmentRows ?? [],
			overlaySummary: displayedTable?.overlaySummary ?? null,
			tablePanelOpen,
			hiddenSeries,
			generationTransform: session.selection.generationTransform,
			marketValueTransform: session.selection.marketValueTransform,
			overlayLines,
			overlayAreas,
			rooftopForecast: forecastShown
		};
	}
</script>

{#snippet fuelTechOptions()}
	<FuelTechOptions
		{group}
		{contributionMode}
		tableColumns={tableColumns.value}
		oncolumnschange={(value) => (tableColumns.value = value)}
		ongroupchange={(value) => session.select('group', value)}
		oncontributionchange={(value) => session.select('contributionMode', value)}
	/>
{/snippet}

{#snippet freshness(name = /** @type {'generation' | 'market' | 'emissions'} */ ('generation'))}
	<ReadingFreshness
		snapshot={data.current(name)}
		now={session.clockMs}
		interval={range.activeInterval}
		following={session.following}
		pending={data.state(name).pending || !data.current(name)}
		error={data.state(name).error}
		timeZone={ianaTimeZone}
		filtered={!!bucketFilter}
	/>
{/snippet}
{#snippet generationKey()}<SeriesLegend
		items={generationLegend}
		label="Generation legend"
	/>{/snippet}
{#snippet marketKey()}<SeriesLegend items={marketLegend} label="Market legend" />{/snippet}
{#snippet emissionsKey()}<SeriesLegend items={emissionsLegend} label="Emissions legend" />{/snippet}
{#snippet comparePanel(/** @type {TimelineCard} */ card)}
	<ComparePanel
		source={compareSource(card)}
		pair={comparePair}
		{armed}
		pending={!data.state(card).error && !data.latest(card)}
		error={data.state(card).error}
		id="{card}-comparison"
		label="{card === 'generation'
			? 'Generation'
			: card === 'market'
				? 'Market'
				: 'Emissions'} comparison"
		fileName={() => compareFileName(card)}
		hovered={hoveredSeries}
		onhover={hoverSeries}
		onarm={(slot) => (armed = slot)}
		onchange={changeComparePair}
		onreveal={revealCompare}
	/>
{/snippet}
{#snippet generationCompare()}{@render comparePanel('generation')}{/snippet}
{#snippet marketCompare()}{@render comparePanel('market')}{/snippet}
{#snippet emissionsCompare()}{@render comparePanel('emissions')}{/snippet}
{#snippet generationFreshness()}{@render freshness('generation')}{/snippet}
{#snippet marketFreshness()}{@render freshness('market')}{/snippet}
{#snippet emissionsFreshness()}{@render freshness('emissions')}{/snippet}

<svelte:document
	onvisibilitychange={() => {
		pageVisible = !document.hidden;
	}}
/>

<!-- The page mounts the canvas in a flex column: the strip sits above the charts row
     and slides open or shut with the page's metrics preference. -->
{#if showMetrics}
	<div class="shrink-0" transition:slide={{ duration: reducedMotion.current ? 0 : 200 }}>
		<WindowMetrics
			{focusTime}
			onfocuschange={(time) => (focusTime = time)}
			input={metrics.input}
			status={metrics.status}
			onretry={metrics.retry}
			interval={range.displayInterval}
			zone={timeZone}
			generationPrefix={generationDisplayPrefix}
			onhighlight={handleHoverChange}
		/>
	</div>
{/if}
<TrackerSplitLayout
	config={FUEL_TECH_SPLIT}
	open={tablePanelOpen}
	onopenchange={onpaneltoggle}
	controls="tracker-table-panel"
	resizeLabel="Resize table panel"
	railLabel="Show fuel tech table"
	bind:engaged={panZoomEngaged}
	pngContext={`${regionLabel(region)} · ${rangeLabel} · ${intervalBadge} · UTC${timeZone} · ${getGroup(group).label}${imageFilterLabel ? ` · ${imageFilterLabel}` : ''}`}
>
	<ChartCard
		title="Generation"
		highlighted={hoveredCard === 'generation' && !!focusColumn}
		onhover={(hovered) => hoverCard('generation', hovered)}
		loading={trackerLoading}
		status={generationFreshness}
		download={downloadFor('generation')}
		legend={generationLegend.length ? generationKey : undefined}
		png={{
			id: 'generation',
			label: 'Generation',
			caption:
				range.displayInterval === '5m' &&
				Object.values(data.current('generation')?.groupFuelTechs ?? {}).some((codes) =>
					codes.includes('solar_rooftop')
				)
					? 'Rooftop solar: 5-minute chart values interpolated between reported half-hour values'
					: '',
			ready:
				data.ready('generation') &&
				!chartsHoldFrame &&
				!session.gestureActive &&
				imageProvidersReady
		}}
		engaged={panZoomEngaged}
		heightStorageKey="tracker-chart-height-generation"
		defaultHeightPx={320}
		compare={{
			open: comparingCards.includes('generation'),
			onopenchange: (open) => setCompareOpen('generation', open),
			panel: generationCompare
		}}
	>
		{#snippet children(heightPx)}
			{#if showContributions || (needsContributionDemand && marketData.error)}
				<p class="px-3 py-1 text-xs text-mid-grey" role="status">
					{#if needsContributionDemand && marketData.error}
						Gross-demand percentages unavailable.
						<button class="underline" onclick={() => marketData.reconcileFetches()}
							>Retry percentage data</button
						>
					{:else}
						Shares per interval; the table summarises the selected window. Change the basis in Fuel
						technology options → Contribution.
					{/if}
				</p>
			{/if}
			<NetworkChart
				bind:this={generationChart}
				{...sharedChartProps}
				{hoverTime}
				metric={range.activeMetric}
				chartKind="stacked"
				nightShading
				title={energyMetric ? 'Energy' : 'Power'}
				chartHeightPx={heightPx}
				generationUnitOptions
				interpolateRooftop
				rooftopForecast={forecastShown ? rooftopForecast.rows : null}
				dataTransform={session.selection.generationTransform}
				ondatatransformchange={(value) => session.select('generationTransform', value)}
				createProportionContext={chartContributionContext}
				{overlayLines}
				{overlayAreas}
				hiddenSeriesNames={hiddenSeries}
				onhoverkeychange={hoverSeries}
				onviewportchange={(next) => session.moveViewport(next, generationChart)}
				onvisibledata={handleGenerationData}
				{...compareChartProps('generation')}
				bind:panZoomEngaged
			/>
		{/snippet}
	</ChartCard>

	<ChartCard
		title="Market"
		highlighted={hoveredCard === 'market' && !!focusColumn}
		onhover={(hovered) => hoverCard('market', hovered)}
		loading={trackerLoading}
		status={marketFreshness}
		download={downloadFor('market')}
		legend={marketLegend.length ? marketKey : undefined}
		png={{
			id: 'market',
			label: 'Market',
			ready: data.ready('market') && !chartsHoldFrame && !session.gestureActive
		}}
		engaged={panZoomEngaged}
		heightStorageKey="tracker-chart-height-price"
		compare={{
			open: comparingCards.includes('market'),
			onopenchange: (open) => setCompareOpen('market', open),
			panel: marketCompare
		}}
	>
		{#snippet controls()}
			{#if regionHasSpotPrice}
				<SwitchTabs
					compact
					ariaLabel="Market chart"
					buttons={[
						{ label: 'Price', value: 'price' },
						{ label: 'Market value', value: 'market_value' }
					]}
					selected={priceMode}
					onChange={(value) =>
						onpricemodechange?.(/** @type {import('./types.js').PriceMode} */ (value))}
				/>
			{:else}
				<span class="text-xs text-mid-grey"> No national spot price — showing market value </span>
			{/if}
		{/snippet}
		{#snippet children(heightPx)}
			<NetworkChart
				bind:this={priceChart}
				{...sharedChartProps}
				{hoverTime}
				metric={priceMetric}
				chartKind={priceIsMarketValue ? 'stacked' : 'line'}
				title={priceIsMarketValue
					? 'Market value'
					: isRollingDisplay
						? 'Volume-weighted price'
						: 'Spot price'}
				chartHeightPx={heightPx}
				hiddenSeriesNames={priceIsMarketValue ? hiddenSeries : []}
				dataTransform={priceIsMarketValue ? session.selection.marketValueTransform : 'absolute'}
				ondatatransformchange={(value) => session.select('marketValueTransform', value)}
				onhoverkeychange={hoverSeries}
				onviewportchange={(next) => session.moveViewport(next, priceChart)}
				onvisibledata={handlePriceData}
				{...compareChartProps('market')}
				bind:panZoomEngaged
			/>
		{/snippet}
	</ChartCard>

	<ChartCard
		title="Emissions"
		highlighted={hoveredCard === 'emissions' && !!focusColumn}
		onhover={(hovered) => hoverCard('emissions', hovered)}
		loading={trackerLoading}
		status={emissionsFreshness}
		download={downloadFor('emissions')}
		legend={emissionsLegend.length ? emissionsKey : undefined}
		png={{
			id: 'emissions',
			label: 'Emissions',
			ready: data.ready('emissions') && !chartsHoldFrame && !session.gestureActive
		}}
		engaged={panZoomEngaged}
		heightStorageKey="tracker-chart-height-emissions"
		compare={{
			open: comparingCards.includes('emissions'),
			onopenchange: (open) => setCompareOpen('emissions', open),
			panel: emissionsCompare
		}}
	>
		{#snippet controls()}
			<SwitchTabs
				compact
				ariaLabel="Emissions chart"
				buttons={[
					{ label: 'Intensity', value: 'intensity' },
					{ label: 'Volume', value: 'volume' }
				]}
				selected={emissionsMode}
				onChange={(value) =>
					onemissionsmodechange?.(/** @type {import('./types.js').EmissionsMode} */ (value))}
			/>
		{/snippet}
		{#snippet children(heightPx)}
			<NetworkChart
				bind:this={emissionsChart}
				{...sharedChartProps}
				{hoverTime}
				metric={emissionsMetric}
				chartKind={emissionsIsIntensity ? 'line' : 'stacked'}
				title={emissionsIsIntensity ? 'Intensity' : 'Volume'}
				chartHeightPx={heightPx}
				hiddenSeriesNames={emissionsIsIntensity ? [] : hiddenSeries}
				excludedFuelTechGroups={emissionsIsIntensity ? hiddenSeries : []}
				onhoverkeychange={hoverSeries}
				onviewportchange={(next) => session.moveViewport(next, emissionsChart)}
				onvisibledata={handleEmissionsData}
				{...compareChartProps('emissions')}
				bind:panZoomEngaged
			/>
		{/snippet}
	</ChartCard>

	{#snippet panel(/** @type {import('./types.js').TrackerDock} */ dock)}
		<FuelTechPanel
			download={downloadFor('table')}
			loading={trackerLoading}
			options={fuelTechOptions}
			bind:closeButton={dock.closer}
			rows={inspectedTable?.rows ?? displayedRows}
			tableColumns={tableColumns.value}
			focusColumns={focusColumn ? [focusColumn] : []}
			focusRow={hoveredSeries}
			valuesPending={tableValuesPending}
			error={data.state('generation').error ?? table.feedsError}
			onretry={() => {
				generationChart?.reconcileFetches();
				table.retryFeeds();
			}}
			basis={displayedTable?.basis ?? range.activeMetric}
			rooftopInterpolation={range.displayInterval === '5m'}
			displayPrefix={generationDisplayPrefix}
			{tableUnits}
			onunitchange={(key, prefix) => (tableUnits = { ...tableUnits, [key]: prefix })}
			group={displayedTable?.group ?? group}
			ongroupchange={(value) => session.select('group', value)}
			oncontributionchange={(value) => session.select('contributionMode', value)}
			contributionMode={displayedTable?.contributionMode ?? contributionMode}
			hiddenCount={hiddenSeries.length}
			curtailmentRows={inspectedTable?.curtailmentRows ?? displayedTable?.curtailmentRows ?? []}
			shownCurtailment={shownCurtailmentIds}
			overlaySummary={inspectedTable?.overlaySummary ?? displayedTable?.overlaySummary ?? null}
			{showDemandLine}
			{showRenewablesLine}
			ontoggle={toggleSeries}
			oncurtailmenttoggle={toggleCurtailment}
			ondemandlinetoggle={(exclusive) => toggleOverlay('demand', exclusive)}
			onrenewableslinetoggle={(exclusive) => toggleOverlay('renewables', exclusive)}
			rooftopForecast={forecastAvailable
				? { active: session.selection.rooftopForecast, runTime: rooftopForecast.runTime, timeZone }
				: null}
			onforecasttoggle={() =>
				session.select('rooftopForecast', !session.selection.rooftopForecast, 'replace')}
			onshowall={showAllSeries}
			onclose={dock.close}
		/>
	{/snippet}
	{#snippet rail()}{@render fuelTechOptions()}{/snippet}
</TrackerSplitLayout>
