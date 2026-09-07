import { EARLIEST_DATA_MS } from '$lib/utils/date-range.js';
import { escapeCsv } from '$lib/utils/download-csv.js';

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
		(row) => !row._bandClose && Number.isFinite(row.time) && row.time <= (snapshot?.end ?? 0)
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

/** @param {import('./types.js').GenerationSnapshot | null} snapshot
 * @param {Comparison} selection @param {string[]} hidden */
export function comparisonRows(snapshot, selection, hidden = []) {
	const buckets = comparisonBuckets(snapshot);
	const a = buckets.find((row) => row.time === selection.a);
	const b = buckets.find((row) => row.time === selection.b);
	return [...(snapshot?.seriesNames ?? [])]
		.reverse()
		.filter((id) => !hidden.includes(id))
		.map((id) => ({
			id,
			label: snapshot?.seriesLabels[id] ?? id,
			colour: snapshot?.seriesColours[id] ?? '#777777',
			...comparisonValues(a?.[id], b?.[id])
		}));
}

/** @param {ReturnType<typeof comparisonRows>} rows
 * @param {{region: string, zone: string, interval: string, a: string, b: string, unit: string}} context */
export function comparisonCsv(rows, context) {
	return [
		[
			'Region',
			'Network time',
			'Interval',
			'Technology',
			'A',
			'B',
			`A (${context.unit})`,
			`B (${context.unit})`,
			`Change B − A (${context.unit})`,
			'Change / |A| (%)'
		],
		...rows.map((row) => [
			context.region,
			`UTC${context.zone}`,
			context.interval,
			row.label,
			context.a,
			context.b,
			row.a,
			row.b,
			row.delta,
			row.percent
		])
	]
		.map((row) => row.map(escapeCsv).join(','))
		.join('\r\n');
}
