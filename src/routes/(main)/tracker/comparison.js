import { EARLIEST_DATA_MS } from '$lib/utils/date-range.js';
import { isObservationRow } from '$lib/components/charts/v2/bucket-filter.js';
import { networkTimeZoneLabel } from '$lib/components/charts/v2/network-time.js';

/** @typedef {{a: number | null, b: number | null}} Comparison */

/** @param {unknown} value @returns {number | null} */
function timestamp(value) {
	if (typeof value !== 'number' && typeof value !== 'string') return null;
	if (typeof value === 'string' && !/^\d+$/.test(value)) return null;
	const time = Number(value);
	return Number.isSafeInteger(time) && time >= EARLIEST_DATA_MS && time <= 8.64e15 ? time : null;
}

/** @param {unknown} value @returns {Comparison | null} */
export function normaliseComparison(value) {
	if (!value || typeof value !== 'object') return null;
	return {
		a: timestamp('a' in value ? value.a : null),
		b: timestamp('b' in value ? value.b : null)
	};
}

/** Display buckets only: never compare a synthetic calendar-band closing row.
 * @param {import('./types.js').GenerationSnapshot | null} snapshot */
export function comparisonBuckets(snapshot) {
	return (snapshot?.data ?? []).filter(
		(row) => isObservationRow(row) && Number.isFinite(row.time) && row.time <= (snapshot?.end ?? 0)
	);
}

/** Signed B − A; percentage direction follows the signed change even for loads.
 * Missing values and zero baselines have no percentage, never Infinity/zero-fill.
 * @param {unknown} a @param {unknown} b */
export function comparisonValues(a, b) {
	const first = typeof a === 'number' && Number.isFinite(a) ? a : null;
	const second = typeof b === 'number' && Number.isFinite(b) ? b : null;
	const delta = first === null || second === null ? null : second - first;
	return {
		a: first,
		b: second,
		delta,
		percent:
			delta === null || first === null || first === 0 ? null : (delta / Math.abs(first)) * 100
	};
}

/** Top-down group order, hidden groups omitted. `isLoad` follows the fuel-tech
 * table's rule — a listed load group, or a negative reading — so both tables
 * file a technology under the same heading.
 * @param {import('./types.js').GenerationSnapshot | null} snapshot
 * @param {Comparison} selection @param {string[]} [hidden]
 * @param {string[]} [loadSeriesIds] - Load groups in the selected grouping */
export function comparisonRows(snapshot, selection, hidden = [], loadSeriesIds = []) {
	const buckets = comparisonBuckets(snapshot);
	const a = buckets.find((row) => row.time === selection.a);
	const b = buckets.find((row) => row.time === selection.b);
	return [...(snapshot?.seriesNames ?? [])]
		.reverse()
		.filter((id) => !hidden.includes(id))
		.map((id) => {
			const values = comparisonValues(a?.[id], b?.[id]);
			return {
				id,
				label: snapshot?.seriesLabels[id] ?? id,
				colour: snapshot?.seriesColours[id] ?? '#777777',
				isLoad: loadSeriesIds.includes(id) || (values.a ?? values.b ?? 0) < 0,
				...values
			};
		});
}

/** The comparison as an export dataset for the shared CSV serialiser: raw
 * signed base-unit values plus the context needed to reproduce them.
 * @param {ReturnType<typeof comparisonRows>} rows
 * @param {{region: string, zone: string, interval: string, a: string, b: string, unit: string}} context
 * @returns {import('./types.js').ExportDataset} */
export function dateComparisonDataset(rows, context) {
	const { region, zone, interval, a, b, unit } = context;
	return {
		key: 'comparison',
		title: 'Two-date comparison',
		columns: [
			{ key: 'region', header: 'Region', type: 'string' },
			{ key: 'timeZone', header: 'Network time', type: 'string' },
			{ key: 'interval', header: 'Interval', type: 'string' },
			{ key: 'label', header: 'Technology', type: 'string' },
			{ key: 'dateA', header: 'A', type: 'string' },
			{ key: 'dateB', header: 'B', type: 'string' },
			{ key: 'a', header: `A (${unit})`, type: 'number' },
			{ key: 'b', header: `B (${unit})`, type: 'number' },
			{ key: 'delta', header: `Change B − A (${unit})`, type: 'number' },
			{ key: 'percent', header: 'Change / |A| (%)', type: 'number' }
		],
		rows: rows.map((row) => ({
			region,
			timeZone: networkTimeZoneLabel(zone),
			interval,
			label: row.label,
			dateA: a,
			dateB: b,
			a: row.a,
			b: row.b,
			delta: row.delta,
			percent: row.percent
		}))
	};
}
