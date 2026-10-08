import { getIntervalHours } from '$lib/components/charts/facility/interval-hours.js';
import { indexOfTime } from '$lib/components/charts/v2/binary-search.js';
import { isObservationRow } from '$lib/components/charts/v2/bucket-filter.js';
import { currentIncompleteInterval } from '$lib/components/charts/v2/incomplete-interval.js';
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

	/**
	 * Native-grain rows with the calendar filter applied to every side of the
	 * table ratios alike. Window summaries read only these: display rows can
	 * overlap (rolling windows) or carry a synthetic band close (calendar
	 * filters), and one grain lets every bucket report its own duration.
	 * @param {HeadlessSeriesProvider} provider
	 * @param {number} start
	 * @param {number} end
	 */
	function nativeRows(provider, start, end) {
		return applyBucketFilter(provider.getVisibleRows(start, end), nativeFilterPredicate);
	}

	// ============================================
	// Fuel-tech table feed
	// ============================================

	/** Use the generation snapshot's bounds so table rows and window stay aligned. */
	let tableWindow = $derived({
		start: generationDataset?.start ?? viewWindow.start,
		end: generationDataset?.end ?? viewWindow.end
	});

	/** The generation snapshot at its native cadence, already filtered. */
	let tableGenerationDataset = $derived(
		generationDataset && { ...generationDataset, data: generationDataset.nativeData }
	);

	/** When the window's data runs to: its end, which a following window
	 *  advances on refresh. Never later than now. Not the ticking clock, which
	 *  would stretch an open bucket's duration past its unchanged energy. */
	let dataAsOfMs = $derived(Math.min(opts.session.clockMs, tableWindow.end));

	/**
	 * Start of the bucket still in progress (the one the chart hatches) among
	 * `rows`, or null. Only energy buckets hold a part-filled total; a power
	 * reading is already an average over its elapsed time. Rolling rows are
	 * trailing years, never cut short here.
	 * @param {Array<Record<string, any>> | undefined} rows @param {string} interval
	 */
	function openBucketStart(rows, interval) {
		if (!rows || range.activeMetric !== 'energy' || isRollingInterval(interval)) return null;
		return (
			currentIncompleteInterval(rows, interval, opts.session.clockMs, ianaTimeZone)?.start ?? null
		);
	}
	let nativeOpenStart = $derived(
		openBucketStart(tableGenerationDataset?.data, range.activeInterval)
	);
	let displayOpenStart = $derived(openBucketStart(generationDataset?.data, range.displayInterval));

	/**
	 * Bucket lengths for one grain. Calendar months and years vary, and filtered
	 * rows skip periods, so a length never comes from the gap between rows. The
	 * bucket still in progress holds energy only up to the data's as-of time,
	 * so it counts only those hours.
	 * @param {string} interval @param {number | null} openStart
	 * @returns {(time: number) => number}
	 */
	function bucketHoursFor(interval, openStart) {
		return (time) => {
			const hours = getIntervalHours(interval, time, ianaTimeZone);
			if (time !== openStart) return hours;
			return Math.min(hours, Math.max(0, (dataAsOfMs - time) / 3_600_000));
		};
	}
	let nativeBucketHours = $derived(bucketHoursFor(range.activeInterval, nativeOpenStart));
	let displayBucketHours = $derived(bucketHoursFor(range.displayInterval, displayOpenStart));

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
				bucketHours: nativeBucketHours,
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
			rows: nativeRows(curtailmentData, start, end),
			series: [...CURTAILMENT_SERIES].reverse(),
			basis: range.activeMetric,
			bucketHours: nativeBucketHours,
			denominatorMWh: contributionDenominatorMWh({
				generationRows: tableGenerationDataset.data,
				seriesNames: tableGenerationDataset.seriesNames,
				basis: range.activeMetric,
				bucketHours: nativeBucketHours,
				mode: contributionMode,
				demandRows: nativeRows(marketData, start, end),
				demandBasis: range.activeMetric,
				loadSeriesIds
			})
		});
	});

	let overlaySummary = $derived(
		computeOverlaySummary({
			demandRows: nativeRows(demandData, viewWindow.start, viewWindow.end),
			marketRows: nativeRows(marketData, viewWindow.start, viewWindow.end),
			shareRows: nativeRows(shareData, viewWindow.start, viewWindow.end),
			basis: range.activeMetric,
			bucketHours: nativeBucketHours
		})
	);

	// ============================================
	// Accepted table
	// ============================================

	/** The feeds behind the table — not the metrics strip's intensity feed,
	 *  whose failure or delay must not hold or fault the table. Disabled
	 *  feeds are never pending. */
	const tableFeeds = [marketData, mvData, emissionsData, demandData, curtailmentData, shareData];
	let feedsPending = $derived(tableFeeds.some((feed) => feed.isPending));
	let feedsError = $derived(tableFeeds.find((feed) => feed.error)?.error ?? null);

	/** Identity of the values on screen: the generation query and its percentage basis. */
	let key = $derived(JSON.stringify([opts.queryKey(), contributionMode]));
	let accepted = $state.raw(/** @type {AcceptedTable | null} */ (null));
	// A latch rather than a derivation: the previous table must survive while
	// the next is pending, and only a fully settled candidate may replace it.
	$effect(() => {
		if (!tablePanelOpen || !opts.ready() || feedsPending || feedsError || !tableRows) return;
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
		!opts.ready() || feedsPending || !!feedsError || accepted?.key !== key
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
		const hours = displayBucketHours(time);
		const bucketHours = () => hours;
		const contribution = {
			generationRows,
			seriesNames: generationDataset.seriesNames,
			basis,
			bucketHours,
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
				bucketHours,
				denominatorMWh: contributionDenominatorMWh(contribution)
			}),
			overlaySummary: computeOverlaySummary({
				demandRows: sample(demandData, displayRowOpts),
				marketRows,
				// The share line's own source: at rolling grains a ratio of
				// 12-month sums, never the official monthly share.
				shareRows: atTime(
					opts.providers.renewableShareRows(tableWindow.start, tableWindow.end, shareRowOpts)
				),
				basis,
				bucketHours
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
		/** Start of the display bucket still in progress on an energy grain (the
		 *  one the chart hatches), or null. */
		get openDisplayBucket() {
			return displayOpenStart;
		},
		/** Display bucket lengths, the bucket in progress counting only its
		 *  elapsed hours. */
		get displayBucketHours() {
			return displayBucketHours;
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
		/** The first failure among the table's own feeds. */
		get feedsError() {
			return feedsError;
		},
		/** Retry the table's own feeds. */
		retryFeeds() {
			for (const feed of tableFeeds) feed.reconcileFetches();
		},
		get displayedRows() {
			return displayedRows;
		}
	};
}
