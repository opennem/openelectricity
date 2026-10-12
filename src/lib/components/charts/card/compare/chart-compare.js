/**
 * Chart compare mode — the pure engine behind every card's A / B comparison
 * (`ComparePanel.svelte`). A card describes what it draws as a
 * `CompareSource` (`chart-compare-sources.js`); this module turns two
 * selected buckets into signed changes, totals and an export dataset, and
 * owns the stepping, sorting and URL validation the panel needs.
 */

import { EARLIEST_DATA_MS } from '$lib/utils/date-range.js';
import { EMPTY_CELL, formatPercentageValue } from '../cell-format.js';

/** @typedef {import('../types.js').CompareSource} CompareSource */
/** @typedef {import('../types.js').CompareDeltaMode} CompareDeltaMode */
/** @typedef {'a' | 'b'} CompareSlot */
/** @typedef {{a: number | null, b: number | null}} ComparePair */
/**
 * One series' comparison. `delta` is signed B − A (or places moved, positive
 * = up, under `rank`); `percent` is relative change and only exists in the
 * `relative` mode. A composition's loads (charging, pumping) read as
 * consumption — their signs inverted (`sign` −1), so they compare and rank
 * alongside the sources.
 * @typedef {{id: string, label: string, colour: string, isLoad: boolean, dashed: boolean,
 *   sign: 1 | -1, a: number | null, b: number | null, delta: number | null, percent: number | null}} CompareRow
 */

export const COMPARE_SLOTS = /** @type {const} */ (['a', 'b']);

/** @param {unknown} value @returns {number | null} */
const finite = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

/** A difference as small as floating-point noise in its operands is no change:
 * ratios and rolling sums of the same readings rarely subtract to exactly zero.
 * @param {number} delta @param {number} a @param {number} b */
const settle = (delta, a, b) =>
	Math.abs(delta) <= 1e-9 * Math.max(1, Math.abs(a), Math.abs(b)) ? 0 : delta;

/**
 * Signed change from A to B.
 * - `relative`: B − A, with the percentage of |A| (so negative loads keep a
 *   meaningful direction); a zero or missing baseline has none.
 * - `points`: B − A for values that are already percentages (shares), so the
 *   change reads in percentage points and a percentage of one would mislead.
 * - `rank`: places moved, A − B, so climbing from #4 to #2 is +2.
 * Missing values never become zero.
 * @param {unknown} a @param {unknown} b @param {CompareDeltaMode} [mode]
 */
export function compareValues(a, b, mode = 'relative') {
	const first = finite(a);
	const second = finite(b);
	const both = first !== null && second !== null;
	const delta = !both
		? null
		: settle(mode === 'rank' ? first - second : second - first, first, second);
	return {
		a: first,
		b: second,
		delta,
		percent:
			mode !== 'relative' || delta === null || !first ? null : (delta / Math.abs(first)) * 100
	};
}

/**
 * Every series compared at A and B, in the source's order. A composition
 * files a series as a load as the fuel-tech table does — a listed load
 * group, or a negative reading — and reads it as consumption: its values
 * and change inverted, so more charging is a rise like more generation.
 * @param {CompareSource | null} source @param {ComparePair} pair
 * @returns {CompareRow[]}
 */
export function compareRows(source, pair) {
	if (!source) return [];
	return source.series.map((series) => {
		/** @param {number | null} time */
		const read = (time) => (time === null ? null : source.value(time, series.id));
		const first = read(pair.a);
		const second = read(pair.b);
		const isLoad =
			source.kind === 'composition' &&
			(!!series.isLoad || (finite(first) ?? finite(second) ?? 0) < 0);
		const sign = isLoad ? -1 : 1;
		/** @param {number | null} value */
		const signed = (value) => (value === null ? null : sign * value);
		return {
			id: series.id,
			label: series.label,
			colour: series.colour,
			dashed: !!series.dashed,
			isLoad,
			sign,
			...compareValues(signed(finite(first)), signed(finite(second)), source.deltaMode)
		};
	});
}

/**
 * A composition's net total: the signed sum of its readings at A and at B,
 * sources less loads (whatever sign the rows read in). `partial` when any
 * row is missing at either side, which leaves that side's total unknown
 * rather than understated.
 * @param {CompareRow[]} rows
 */
export function compareTotals(rows) {
	/** @param {CompareSlot} side */
	const total = (side) =>
		rows.length && rows.every((row) => row[side] !== null)
			? rows.reduce((sum, row) => sum + row.sign * /** @type {number} */ (row[side]), 0)
			: null;
	return {
		...compareValues(total('a'), total('b')),
		partial: rows.some((row) => row.a === null || row.b === null)
	};
}

/**
 * A change as text: `format`'s reading of it, led by + when it rises (a
 * fall keeps the formatter's own minus); missing reads as an em dash.
 * @param {number | null} value @param {(value: number) => string} format
 */
export function formatSignedChange(value, format) {
	if (value === null || !Number.isFinite(value)) return EMPTY_CELL;
	const magnitude = format(Math.abs(value));
	// A change too small to show reads as no change, never "-0.0".
	if (magnitude === format(0)) return magnitude;
	return `${value > 0 ? '+' : '-'}${magnitude}`;
}

/** A relative change, `+12.5%`; missing reads as an em dash.
 * @param {number | null} value */
export function formatComparePercent(value) {
	return formatSignedChange(value, (number) => `${formatPercentageValue(number)}%`);
}

/** Places moved between ranks, `▲2` / `▼1.5` / `0`.
 * @param {number | null} value */
export function formatRankChange(value) {
	if (value === null || !Number.isFinite(value)) return EMPTY_CELL;
	const places = Math.abs(value).toLocaleString('en-AU', { maximumFractionDigits: 1 });
	return value > 0 ? `▲${places}` : value < 0 ? `▼${places}` : '0';
}

/** The largest change either way, for a shared bar scale; 0 when none.
 * @param {CompareRow[]} rows */
export function deltaExtent(rows) {
	return rows.reduce((max, row) => Math.max(max, Math.abs(row.delta ?? 0)), 0);
}

/**
 * How far a row moves, for ordering: its change, or — for a series with a
 * reading at only one end (one that started or stopped in between, such as
 * solar before it was built) — its rise from or fall to nothing. Its cells
 * still read missing; only the order counts it. Null with no reading at all.
 * @param {CompareRow} row
 */
function sortChange(row) {
	if (row.delta !== null) return row.delta;
	if (row.a === null && row.b === null) return null;
	return (row.b ?? 0) - (row.a ?? 0);
}

/**
 * The rows in the source's order (`stack`) or by their change (`change`):
 * the largest rise first down to the largest fall, so the bars step down
 * one diagonal — a series appearing between A and B ranks as a rise, one
 * disappearing as a fall. Rows with no reading go last; ties keep their
 * order.
 * @param {CompareRow[]} rows @param {'stack' | 'change'} order
 */
export function sortCompareRows(rows, order) {
	if (order === 'stack') return rows;
	return rows
		.map((row, index) => ({ row, index, change: sortChange(row) }))
		.sort((x, y) => {
			if (x.change === null || y.change === null)
				return Number(x.change === null) - Number(y.change === null) || x.index - y.index;
			return y.change - x.change || x.index - y.index;
		})
		.map(({ row }) => row);
}

/**
 * The time `steps` buckets from `time` among the selectable `times`
 * (ascending), clamped to the ends. A time that isn't one of them steps from
 * where it would sit; none yet starts at the end the step heads for.
 * @param {number[]} times @param {number | null} time @param {number} steps
 * @returns {number | null}
 */
export function stepCompareTime(times, time, steps) {
	if (!times.length) return null;
	if (time === null) return steps > 0 ? times[0] : /** @type {number} */ (times.at(-1));
	let index = times.indexOf(time);
	if (index < 0) {
		const after = times.findIndex((candidate) => candidate > time);
		const insertion = after < 0 ? times.length : after;
		// A step forward lands on the next bucket, a step back on the previous.
		index = steps > 0 ? insertion - 1 : insertion;
	}
	return times[Math.max(0, Math.min(times.length - 1, index + steps))];
}

/** The time in `times` closest to `time` (the earlier on a tie).
 * @param {number[]} times @param {number} time @returns {number | null} */
export function nearestCompareTime(times, time) {
	let best = null;
	for (const candidate of times) {
		if (best === null || Math.abs(candidate - time) < Math.abs(best - time)) best = candidate;
	}
	return best;
}

/** A newly opened comparison: the first and last selectable buckets.
 * @param {number[]} times @returns {ComparePair} */
export function defaultComparePair(times) {
	return { a: times[0] ?? null, b: times.at(-1) ?? null };
}

/**
 * The next pick: `time` lands in the armed slot, and the other slot is armed
 * next, so two clicks set A then B.
 * @param {ComparePair} pair @param {CompareSlot} armed @param {number} time
 * @returns {{pair: ComparePair, armed: CompareSlot}}
 */
export function pickCompareTime(pair, armed, time) {
	return { pair: { ...pair, [armed]: time }, armed: armed === 'a' ? 'b' : 'a' };
}

/**
 * A comparison's A and B as a chart's time markers (the v2 store's
 * `timeMarkers`): a letter each, the band between them, and the armed slot
 * whose ghost follows the hover.
 * @param {ComparePair} pair @param {CompareSlot} armed
 */
export function compareTimeMarkers(pair, armed) {
	return {
		markers: COMPARE_SLOTS.flatMap((slot) => {
			const time = pair[slot];
			return time === null ? [] : [{ id: slot, time, label: slot.toUpperCase() }];
		}),
		armed,
		band: true
	};
}

/**
 * The comparison as an export dataset for the shared CSV serialiser: the
 * source's raw signed base-unit values plus the context needed to reproduce
 * them.
 * @param {CompareRow[]} rows
 * @param {{key: string, title: string, rowHeader: string, unit: string, mode: CompareDeltaMode,
 *   a: string, b: string, context?: Array<{key: string, header: string, value: string}>}} options
 * @returns {import('../types.js').ExportDataset}
 */
export function compareDataset(rows, options) {
	const { key, title, rowHeader, unit, mode, a, b, context = [] } = options;
	const valueHeader = mode === 'rank' ? 'rank' : unit;
	/** @type {import('../types.js').ExportColumn[]} */
	const columns = [
		...context.map((entry) => ({
			key: entry.key,
			header: entry.header,
			type: /** @type {const} */ ('string')
		})),
		{ key: 'label', header: rowHeader, type: 'string' },
		// Loads read as consumption (positive), as the panel shows them.
		...(rows.some((row) => row.isLoad)
			? [{ key: 'load', header: 'Load (as consumption)', type: /** @type {const} */ ('boolean') }]
			: []),
		{ key: 'dateA', header: 'A', type: 'string' },
		{ key: 'dateB', header: 'B', type: 'string' },
		{ key: 'a', header: `A (${valueHeader})`, type: 'number' },
		{ key: 'b', header: `B (${valueHeader})`, type: 'number' },
		{
			key: 'delta',
			header:
				mode === 'rank'
					? 'Places moved (A → B)'
					: `Change B − A (${mode === 'points' ? 'pp' : unit})`,
			type: 'number'
		},
		...(mode === 'relative'
			? [{ key: 'percent', header: 'Change / |A| (%)', type: /** @type {const} */ ('number') }]
			: [])
	];
	return {
		key,
		title,
		columns,
		rows: rows.map((row) => ({
			...Object.fromEntries(context.map((entry) => [entry.key, entry.value])),
			label: row.label,
			load: row.isLoad,
			dateA: a,
			dateB: b,
			a: row.a,
			b: row.b,
			delta: row.delta,
			percent: row.percent
		}))
	};
}

/** @param {unknown} value @returns {number | null} */
function epochMs(value) {
	if (typeof value !== 'number' && typeof value !== 'string') return null;
	if (typeof value === 'string' && !/^\d+$/.test(value)) return null;
	const time = Number(value);
	return Number.isSafeInteger(time) && time >= EARLIEST_DATA_MS && time <= 8.64e15 ? time : null;
}

/**
 * A page's comparison state from untrusted input (URL, history): the open
 * cards, valid and in `cardIds` order, and exact A / B times. No open card
 * means no comparison.
 * @template {string} Card
 * @param {unknown} value @param {readonly Card[]} cardIds
 * @param {(value: unknown) => number | null} [time] - Validates a time (epoch ms by default)
 * @returns {{cards: Card[], a: number | null, b: number | null} | null}
 */
export function normaliseCardComparison(value, cardIds, time = epochMs) {
	if (!value || typeof value !== 'object') return null;
	const cards = 'cards' in value && Array.isArray(value.cards) ? value.cards : [];
	const open = cardIds.filter((id) => cards.includes(id));
	if (!open.length) return null;
	return {
		cards: open,
		a: time('a' in value ? value.a : null),
		b: time('b' in value ? value.b : null)
	};
}

/**
 * The next comparison state when a card's compare mode is switched: opening
 * a card keeps the page's A / B (or starts at `initial`), closing the last
 * card closes the comparison.
 * @template {string} Card
 * @param {{cards: Card[], a: number | null, b: number | null} | null} current
 * @param {Card} card @param {boolean} open @param {ComparePair} initial
 */
export function toggleCompareCard(current, card, open, initial) {
	const cards = (current?.cards ?? []).filter((id) => id !== card);
	if (open) cards.push(card);
	if (!cards.length) return null;
	return { cards, a: current ? current.a : initial.a, b: current ? current.b : initial.b };
}
