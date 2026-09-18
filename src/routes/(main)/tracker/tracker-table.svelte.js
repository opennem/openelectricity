import { getIntervalHours } from '$lib/components/charts/facility/interval-hours.js';
import { indexOfTime } from '$lib/components/charts/v2/binary-search.js';
import { isObservationRow } from '$lib/components/charts/v2/bucket-filter.js';
import {
	applyBucketFilter,
	bucketFilterPredicate,
	bucketFilterKindFor
} from '$lib/components/charts/v2/bucket-filter.js';
import { isRollingInterval } from '$lib/components/charts/facility/range-interval-config.js';
import { getGroup, loadGroupsFor } from '$lib/components/charts/network/groups.js';
import { CURTAILMENT_SERIES } from './tracker-overlays.js';
import { perfSpan } from '$lib/components/charts/v2/perf.js';
import {
	buildFuelTechTableRows,
	computeCurtailmentRows,
	computeOverlaySummary,
	contributionDenominatorMWh
} from './table-model.js';
/** @typedef {import('$lib/components/charts/network/headless-series-provider.svelte.js').HeadlessSeriesProvider} HeadlessSeriesProvider */

/**
 * One complete, accepted table together with the labels that describe its
 * values — held through refreshes so the panel never shows half of a new window.
 * @typedef {Object} AcceptedTable
 * @property {string} key - The generation query plus the percentage basis
 * @property {string} group
 * @property {'power' | 'energy'} basis
 * @property {import('./types.js').ContributionMode} contributionMode
 * @property {import('./types.js').FuelTechTableRow[]} rows
 * @property {import('./types.js').CurtailmentTableRow[]} curtailmentRows
 * @property {import('./types.js').OverlaySummary} overlaySummary
 */

/** Derive all table sections from the same generation window and provider set,
 * and accept a complete table only once every feed behind it has settled.
 * @param {{session: ReturnType<typeof import('./tracker-session.svelte.js').createTrackerSession>,
 * providers: ReturnType<typeof import('./tracker-providers.svelte.js').createTrackerProviders>,
 * generation: () => import('./types.js').GenerationSnapshot | null,
 * queryKey: () => string, ready: () => boolean,
 * hidden: () => string[], contribution: () => import('./types.js').ContributionMode,
 * inspectTime?: () => number | undefined,
 * ianaTimeZone: () => string}} opts - `generation` is the accepted generation
 *   snapshot, `queryKey`/`ready` its identity and readiness */
export function createTrackerTable(opts) {
	const range = opts.session.range;
	const { mvData, emissionsData, marketData, demandData, curtailmentData, shareData } =
		opts.providers;
	let generationDataset = $derived(opts.generation());
	let viewWindow = $derived(opts.session.window);
	let bucketFilter = $derived(opts.session.selection.bucketFilter);
	let tablePanelOpen = $derived(opts.session.selection.tablePanelOpen);
	let group = $derived(opts.session.selection.group);
	let contributionMode = $derived(opts.contribution());
	let hiddenSeries = $derived(opts.hidden());
	let loadSeriesIds = $derived(loadGroupsFor(getGroup(opts.session.selection.group)));
	let isRollingDisplay = $derived(isRollingInterval(range.displayInterval));
	let ianaTimeZone = $derived(opts.ianaTimeZone());
	/** Rolling windows keep all source months; filters select only output samples. */
	let nativeFilterPredicate = $derived.by(() => {
		if (!bucketFilter || isRollingDisplay) return null;
		return bucketFilterPredicate(
			bucketFilterKindFor(range.displayInterval),
			bucketFilter,
			ianaTimeZone
		);
	});

	/** Display-grain options for the extras — they track the central Interval
	 *  control exactly like the charts. Per-bucket quantities (energy basis)
	 *  aggregate by sum; instantaneous ones by mean. */
	let displayRowOpts = $derived({
		displayInterval: range.displayInterval,
		ianaTimeZone,
		method: /** @type {'sum' | 'mean'} */ (range.activeMetric === 'energy' ? 'sum' : 'mean'),
		bucketFilter
	});
	let shareRowOpts = $derived({ ...displayRowOpts, method: /** @type {const} */ ('mean') });

	/** Summaries use native rows whenever display rows would overlap (rolling
	 *  windows) or carry a synthetic band close (calendar filters). */
	let summariesUseNativeRows = $derived(isRollingDisplay || !!bucketFilter);

	/**
	 * Native-grain rows with the calendar filter applied to every side of the
	 * table ratios alike.
	 * @param {HeadlessSeriesProvider} provider
	 * @param {number} start
	 * @param {number} end
	 */
	function nativeRows(provider, start, end) {
		return applyBucketFilter(provider.getVisibleRows(start, end), nativeFilterPredicate);
	}

	/**
	 * Rows for a window summary — native when display rows can't be summed
	 * safely, otherwise the same display-grain rows the chart renders.
	 * @param {HeadlessSeriesProvider} provider
	 * @param {number} start
	 * @param {number} end
	 * @param {typeof displayRowOpts} opts
	 */
	function summaryRows(provider, start, end, opts) {
		return summariesUseNativeRows
			? nativeRows(provider, start, end)
			: provider.getDisplayRows(start, end, opts);
	}

	// ============================================
	// Fuel-tech table feed
	// ============================================

	/** Use the generation snapshot's bounds so table rows and window stay aligned. */
	let tableWindow = $derived({
		start: generationDataset?.start ?? viewWindow.start,
		end: generationDataset?.end ?? viewWindow.end
	});

	/** Use native rows when display rows overlap or contain a synthetic band close. */
	let tableGenerationDataset = $derived(
		summariesUseNativeRows && generationDataset?.nativeData
			? { ...generationDataset, data: generationDataset.nativeData }
			: generationDataset
	);

	/** Recompute table rows when chart or provider data changes. */
	let tableRows = $derived.by(() => {
		if (!tableGenerationDataset) return null;
		const { start, end } = tableWindow;
		return perfSpan('canvas:table-rows', () =>
			buildFuelTechTableRows({
				generationData: tableGenerationDataset,
				mvRows: nativeRows(mvData, start, end),
				emissionsRows: nativeRows(emissionsData, start, end),
				demandRows: nativeRows(marketData, start, end),
				basis: range.activeMetric,
				demandBasis: range.activeMetric,
				mode: contributionMode,
				hiddenSeries,
				loadSeriesIds
			})
		);
	});

	/** Curtailment sits outside the fuel-tech grouping but shares the table's
	 *  contribution denominator. Rows list top-down like the fuel techs. */
	let curtailmentRows = $derived.by(() => {
		if (!tableGenerationDataset) return [];
		const { start, end } = tableWindow;
		return computeCurtailmentRows({
			rows: summaryRows(curtailmentData, start, end, displayRowOpts),
			series: [...CURTAILMENT_SERIES].reverse(),
			basis: range.activeMetric,
			denominatorMWh: contributionDenominatorMWh({
				generationRows: tableGenerationDataset.data,
				seriesNames: tableGenerationDataset.seriesNames,
				basis: range.activeMetric,
				mode: contributionMode,
				demandRows: nativeRows(marketData, start, end),
				demandBasis: range.activeMetric,
				loadSeriesIds
			})
		});
	});

	let overlaySummary = $derived(
		computeOverlaySummary({
			demandRows: summaryRows(demandData, viewWindow.start, viewWindow.end, displayRowOpts),
			marketRows: nativeRows(marketData, viewWindow.start, viewWindow.end),
			shareRows: summaryRows(shareData, viewWindow.start, viewWindow.end, shareRowOpts),
			basis: range.activeMetric
		})
	);

	// ============================================
	// Accepted table
	// ============================================

	/** Identity of the values on screen: the generation query and its percentage basis. */
	let key = $derived(JSON.stringify([opts.queryKey(), contributionMode]));
	let accepted = $state.raw(/** @type {AcceptedTable | null} */ (null));
	// A latch rather than a derivation: the previous table must survive while
	// the next is pending, and only a fully settled candidate may replace it.
	$effect(() => {
		if (
			!tablePanelOpen ||
			!opts.ready() ||
			opts.providers.pending ||
			opts.providers.error ||
			!tableRows
		)
			return;
		accepted = {
			key,
			group,
			basis: range.activeMetric,
			contributionMode,
			rows: tableRows,
			curtailmentRows,
			overlaySummary
		};
	});
	let valuesPending = $derived(
		!opts.ready() || opts.providers.pending || !!opts.providers.error || accepted?.key !== key
	);
	/** Visibility stays responsive while the values are held through a refresh. */
	let displayedRows = $derived(
		accepted?.rows.map((row) => ({ ...row, hidden: hiddenSeries.includes(row.id) })) ?? null
	);

	/** Inspection never replaces the accepted window totals used by metrics and
	 * exports. Every feed is sampled at the same display bucket; missing samples
	 * remain empty rather than borrowing a neighbouring observation. */
	let inspection = $derived.by(() => {
		const time = opts.inspectTime?.();
		if (
			time === undefined ||
			!tablePanelOpen ||
			valuesPending ||
			opts.session.gestureActive ||
			!generationDataset
		)
			return null;
		if (time < viewWindow.start || time > viewWindow.end) return null;
		/** @param {Array<Record<string, any>>} rows */
		const atTime = (rows) => {
			const row = rows[indexOfTime(/** @type {{time: number}[]} */ (rows), time)];
			return row && isObservationRow(row) ? [row] : [];
		};
		const generationRows = atTime(generationDataset.data);
		/** @param {HeadlessSeriesProvider} provider @param {typeof displayRowOpts} options */
		const sample = (provider, options) =>
			atTime(provider.getDisplayRows(tableWindow.start, tableWindow.end, options));
		const totals = { ...displayRowOpts, method: /** @type {const} */ ('sum') };
		const marketRows = sample(marketData, displayRowOpts);
		const basis = range.activeMetric;
		const hours = getIntervalHours(range.displayInterval, time, ianaTimeZone);
		const contribution = {
			generationRows,
			seriesNames: generationDataset.seriesNames,
			basis,
			hours,
			mode: contributionMode,
			demandRows: marketRows,
			demandBasis: basis,
			loadSeriesIds
		};
		return {
			time,
			rows: buildFuelTechTableRows({
				generationData: { ...generationDataset, data: generationRows },
				mvRows: sample(mvData, totals),
				emissionsRows: sample(emissionsData, totals),
				...contribution,
				hiddenSeries
			}),
			curtailmentRows: computeCurtailmentRows({
				rows: sample(curtailmentData, displayRowOpts),
				series: [...CURTAILMENT_SERIES].reverse(),
				basis,
				hours,
				denominatorMWh: contributionDenominatorMWh(contribution)
			}),
			overlaySummary: computeOverlaySummary({
				demandRows: sample(demandData, displayRowOpts),
				marketRows,
				shareRows: sample(shareData, shareRowOpts),
				basis,
				hours
			})
		};
	});

	return {
		get inspection() {
			return inspection;
		},
		get rows() {
			return tableRows;
		},
		get rowIds() {
			return (tableRows ?? []).map((row) => row.id);
		},
		get curtailmentRows() {
			return curtailmentRows;
		},
		get overlaySummary() {
			return overlaySummary;
		},
		get displayRowOpts() {
			return displayRowOpts;
		},
		get shareRowOpts() {
			return shareRowOpts;
		},
		get accepted() {
			return accepted;
		},
		get valuesPending() {
			return valuesPending;
		},
		get displayedRows() {
			return displayedRows;
		}
	};
}
