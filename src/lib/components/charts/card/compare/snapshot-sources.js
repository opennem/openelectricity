/**
 * Compare sources from chart snapshots — the `CompareSource` a chart card
 * hands its compare panel, built from what the chart reports drawing
 * (`ChartSnapshot`: its visible rows and series). Pure module.
 *
 * - `stackCompareSource`: a stack's visible series (top of the stack first),
 *   compared as a composition with a net total.
 * - `lineCompareSource`: one line (A and B tiles over the window's range) or
 *   several independent lines (a slope chart and a list).
 *
 * `held` are rows the chart drew at A or B before a pan moved them off
 * screen (`compare-pins.svelte.js`), so a comparison never blanks mid-pan.
 */

import { isObservationRow } from '$lib/components/charts/v2/bucket-filter.js';
import { formatSignedChange } from './chart-compare.js';

/** @typedef {import('../types.js').ChartSnapshot} ChartSnapshot */
/** @typedef {import('../types.js').CompareSource} CompareSource */
/** @typedef {Record<number, Record<string, any>>} HeldRows */
/**
 * What every snapshot source takes besides its snapshot.
 * @typedef {{
 *   title: string,
 *   unit: string,
 *   baseUnit: string,
 *   format: (value: number | null) => string,
 *   formatTime: (time: number) => string,
 *   held?: HeldRows,
 *   context?: Array<{key: string, header: string, value: string}>,
 *   note?: string
 * }} SourceOptions
 */

const LINE_COLOUR = '#353535';

/** The buckets a comparison can pick: displayed observation rows within the
 * window, never a synthetic calendar-band closing row.
 * @param {ChartSnapshot | null} snapshot */
export function compareBuckets(snapshot) {
	return (snapshot?.data ?? []).filter(
		(row) =>
			isObservationRow(row) &&
			Number.isFinite(row.time) &&
			(snapshot?.end === undefined || row.time <= snapshot.end)
	);
}

/**
 * A snapshot's rows by time, with the held rows behind them.
 * @param {ChartSnapshot} snapshot @param {HeldRows} held
 */
function lookup(snapshot, held) {
	const buckets = compareBuckets(snapshot);
	const byTime = new Map(buckets.map((row) => [row.time, row]));
	return {
		buckets,
		times: buckets.map((row) => row.time),
		/** @param {number} time */
		rowAt: (time) => byTime.get(time) ?? held[time],
		/** @param {number} time */
		has: (time) => time in held
	};
}

/** @param {unknown} value @returns {number | null} */
const finite = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/**
 * A stack's comparison: its visible series, top of the stack first, loads
 * listed in `loadIds` (or reading negative). Where the chart drew a bucket, a
 * series without a reading in it (a technology before it was built, or after
 * it retired) adds nothing to the stack, so it compares as 0; a bucket the
 * chart never drew stays missing.
 * @param {ChartSnapshot | null} snapshot
 * @param {SourceOptions & {rowHeader?: string, hidden?: string[], loadIds?: string[]}} options
 * @returns {CompareSource | null}
 */
export function stackCompareSource(snapshot, options) {
	if (!snapshot) return null;
	const { held = {}, hidden = [], loadIds = [], format, rowHeader = 'Technology' } = options;
	const { times, rowAt, has } = lookup(snapshot, held);
	return {
		kind: 'composition',
		title: options.title,
		rowHeader,
		times,
		has,
		series: [...snapshot.seriesNames]
			.reverse()
			.filter((id) => !hidden.includes(id))
			.map((id) => ({
				id,
				label: snapshot.seriesLabels[id] ?? id,
				colour: snapshot.seriesColours[id] ?? '#777777',
				isLoad: loadIds.includes(id)
			})),
		value: (time, id) => {
			const row = rowAt(time);
			return row ? (finite(row[id]) ?? 0) : null;
		},
		deltaMode: 'relative',
		unit: options.unit,
		baseUnit: options.baseUnit,
		format,
		formatDelta: (value) => formatSignedChange(value, format),
		formatTime: options.formatTime,
		context: options.context,
		note: options.note
	};
}

/**
 * A line chart's comparison. One line compares as A and B tiles over the
 * window's range, with its mean (or `reference`, e.g. a ratio of window
 * sums) marked; several independent lines compare as a slope chart and a
 * list, without a total.
 * @param {ChartSnapshot | null} snapshot
 * @param {SourceOptions & {
 *   series?: string[],
 *   label?: string,
 *   read?: (row: Record<string, any>, id: string) => unknown,
 *   reference?: (rows: Array<Record<string, any>>) => number | null,
 *   referenceLabel?: string
 * }} options - `series` defaults to the snapshot's; `read` reads a value
 *   the row doesn't hold as such (derived from components)
 * @returns {CompareSource | null}
 */
export function lineCompareSource(snapshot, options) {
	if (!snapshot) return null;
	const { held = {}, format } = options;
	const ids = options.series ?? snapshot.seriesNames;
	const read = options.read ?? ((row, id) => row[id]);
	const { buckets, times, rowAt, has } = lookup(snapshot, held);
	/** @param {number} time @param {string} id */
	const value = (time, id) => {
		const row = rowAt(time);
		return row ? finite(read(row, id)) : null;
	};
	const single = ids.length === 1;
	const values = single
		? buckets.map((row) => finite(read(row, ids[0]))).filter((entry) => entry !== null)
		: [];
	const reference = !values.length
		? null
		: options.reference
			? finite(options.reference(buckets))
			: values.reduce((sum, entry) => sum + entry, 0) / values.length;
	return {
		kind: single ? 'single' : 'lines',
		title: options.title,
		rowHeader: single ? 'Metric' : 'Series',
		times,
		has,
		series: ids.map((id) => ({
			id,
			label: single
				? (options.label ?? snapshot.seriesLabels[id] ?? id)
				: (snapshot.seriesLabels[id] ?? id),
			colour: single ? LINE_COLOUR : (snapshot.seriesColours[id] ?? LINE_COLOUR)
		})),
		value,
		deltaMode: 'relative',
		unit: options.unit,
		baseUnit: options.baseUnit,
		format,
		formatDelta: (entry) => formatSignedChange(entry, format),
		formatTime: options.formatTime,
		window: values.length
			? {
					min: Math.min(...values),
					max: Math.max(...values),
					reference,
					referenceLabel: options.referenceLabel ?? 'Mean'
				}
			: null,
		context: options.context,
		note: options.note
	};
}

/**
 * Sums of each component over the rows, so a ratio line's window reference
 * is the ratio of its sums, as the chart's own rolling buckets are.
 * @param {Array<Record<string, any>>} rows @param {string[]} keys
 */
export function componentSums(rows, keys) {
	return Object.fromEntries(
		keys.map((key) => [
			key,
			rows.reduce((sum, row) => (Number.isFinite(row[key]) ? sum + row[key] : sum), 0)
		])
	);
}
