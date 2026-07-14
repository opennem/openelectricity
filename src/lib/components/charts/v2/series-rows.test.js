import { describe, it, expect } from 'vitest';
import { collectSeriesByTimestamp, orderSeriesIds, rowsFromSeriesMaps } from './series-rows.js';

const response = (/** @type {any[]} */ results, metric = 'power') => ({
	data: [{ metric, results }]
});

/** @type {(series: any) => { id: string }} */
const byName = (series) => ({ id: series.name });

describe('collectSeriesByTimestamp', () => {
	it('parses timestamps by stripping any embedded offset and re-applying the network offset', () => {
		const { seriesMaps, timestamps } = collectSeriesByTimestamp(
			response([
				{
					name: 'a',
					data: [
						['2026-01-21T01:00:00+10:00', 1],
						['2026-01-21T02:00:00Z', 2],
						['2026-01-21T03:00:00', 3]
					]
				}
			]),
			{ metricFilter: 'power', networkTimezone: '+08:00', classifySeries: byName }
		);

		// All three forms normalise to Perth local time
		const expected = [
			new Date('2026-01-21T01:00:00+08:00').getTime(),
			new Date('2026-01-21T02:00:00+08:00').getTime(),
			new Date('2026-01-21T03:00:00+08:00').getTime()
		];
		expect([...timestamps].sort((x, y) => x - y)).toEqual(expected);
		expect(seriesMaps.get('a')?.get(expected[0])).toBe(1);
	});

	it('skips series the classifier rejects and non-matching metrics', () => {
		const resp = {
			data: [
				{ metric: 'power', results: [{ name: 'keep', data: [['2026-01-21T01:00:00', 1]] }] },
				{
					metric: 'energy',
					results: [{ name: 'wrong-metric', data: [['2026-01-21T01:00:00', 1]] }]
				}
			]
		};
		const { seriesMaps } = collectSeriesByTimestamp(resp, {
			metricFilter: 'power',
			networkTimezone: '+10:00',
			classifySeries: (s) => (s.name === 'keep' ? { id: s.name } : null)
		});
		expect([...seriesMaps.keys()]).toEqual(['keep']);
	});

	describe("mode: 'set'", () => {
		it('stores null samples and their timestamps, and drops series with no parsed pairs', () => {
			const { seriesMaps, timestamps } = collectSeriesByTimestamp(
				response([
					{ name: 'a', data: [['2026-01-21T01:00:00', null]] },
					{ name: 'empty', data: [] },
					{ name: 'unparseable', data: [['nope', 5]] }
				]),
				{ metricFilter: 'power', networkTimezone: '+10:00', classifySeries: byName }
			);

			expect([...seriesMaps.keys()]).toEqual(['a']);
			expect(timestamps.size).toBe(1);
			const ms = [...timestamps][0];
			expect(seriesMaps.get('a')?.has(ms)).toBe(true);
			expect(seriesMaps.get('a')?.get(ms)).toBeNull();
		});

		it('negates inverted series but leaves null samples untouched', () => {
			const { seriesMaps } = collectSeriesByTimestamp(
				response([
					{
						name: 'load',
						data: [
							['2026-01-21T01:00:00', 5],
							['2026-01-21T02:00:00', null]
						]
					}
				]),
				{
					metricFilter: 'power',
					networkTimezone: '+10:00',
					classifySeries: byName,
					shouldInvert: (id) => id === 'load'
				}
			);
			const values = [...(seriesMaps.get('load')?.values() ?? [])];
			expect(values).toEqual([-5, null]);
		});

		it('keeps the meta of the last series when ids collide (replacement semantics)', () => {
			const { seriesMaps, seriesMeta } = collectSeriesByTimestamp(
				response([
					{ name: 'a', tag: 1, data: [['2026-01-21T01:00:00', 1]] },
					{ name: 'a', tag: 2, data: [['2026-01-21T02:00:00', 2]] }
				]),
				{
					metricFilter: 'power',
					networkTimezone: '+10:00',
					classifySeries: (s) => ({ id: s.name, meta: s.tag })
				}
			);
			// Second map replaces the first entirely
			expect(seriesMaps.get('a')?.size).toBe(1);
			expect(seriesMeta.get('a')).toBe(2);
		});
	});

	describe("mode: 'sum'", () => {
		it('sums multiple series that classify to the same id, per timestamp', () => {
			const { seriesMaps } = collectSeriesByTimestamp(
				response([
					{ name: 'coal_black', data: [['2026-01-21T01:00:00', 100]] },
					{ name: 'coal_brown', data: [['2026-01-21T01:00:00', 40]] }
				]),
				{
					metricFilter: 'power',
					networkTimezone: '+10:00',
					mode: 'sum',
					classifySeries: () => ({ id: 'coal' })
				}
			);
			const ms = new Date('2026-01-21T01:00:00+10:00').getTime();
			expect(seriesMaps.get('coal')?.get(ms)).toBe(140);
		});

		it('skips null samples so they neither zero the sum nor claim a timestamp', () => {
			const { seriesMaps, timestamps } = collectSeriesByTimestamp(
				response([
					{
						name: 'rooftop',
						data: [
							['2026-01-21T01:00:00', 10],
							['2026-01-21T02:00:00', null]
						]
					}
				]),
				{
					metricFilter: 'power',
					networkTimezone: '+10:00',
					mode: 'sum',
					classifySeries: byName
				}
			);
			expect(timestamps.size).toBe(1);
			expect(seriesMaps.get('rooftop')?.size).toBe(1);
		});

		it('registers a classified series even when all its samples are null', () => {
			const { seriesMaps } = collectSeriesByTimestamp(
				response([{ name: 'quiet', data: [['2026-01-21T01:00:00', null]] }]),
				{
					metricFilter: 'power',
					networkTimezone: '+10:00',
					mode: 'sum',
					classifySeries: byName
				}
			);
			expect(seriesMaps.has('quiet')).toBe(true);
			expect(seriesMaps.get('quiet')?.size).toBe(0);
		});

		it('inverts before summing', () => {
			const { seriesMaps } = collectSeriesByTimestamp(
				response([
					{ name: 'pump_a', data: [['2026-01-21T01:00:00', 3]] },
					{ name: 'pump_b', data: [['2026-01-21T01:00:00', 4]] }
				]),
				{
					metricFilter: 'power',
					networkTimezone: '+10:00',
					mode: 'sum',
					classifySeries: () => ({ id: 'pumps' }),
					shouldInvert: () => true
				}
			);
			const ms = new Date('2026-01-21T01:00:00+10:00').getTime();
			expect(seriesMaps.get('pumps')?.get(ms)).toBe(-7);
		});
	});
});

describe('orderSeriesIds', () => {
	it('returns present ids as-is when no order is preferred', () => {
		expect(orderSeriesIds(['b', 'a'])).toEqual(['b', 'a']);
		expect(orderSeriesIds(['b', 'a'], [])).toEqual(['b', 'a']);
	});

	it('applies the preferred order and appends extras in encounter order', () => {
		expect(orderSeriesIds(['c', 'a', 'x', 'y'], ['a', 'b', 'c'])).toEqual(['a', 'c', 'x', 'y']);
	});

	it('drops preferred ids that are not present', () => {
		expect(orderSeriesIds(['a'], ['b', 'a'])).toEqual(['a']);
	});
});

describe('rowsFromSeriesMaps', () => {
	it('builds sorted rows with null for absent samples', () => {
		const t1 = new Date('2026-01-21T01:00:00+10:00').getTime();
		const t2 = new Date('2026-01-21T02:00:00+10:00').getTime();
		const maps = new Map([
			['a', new Map([[t2, 2]])],
			['b', new Map([[t1, 1]])]
		]);

		const rows = rowsFromSeriesMaps(maps, new Set([t2, t1]), ['a', 'b']);
		expect(rows).toEqual([
			{ date: new Date(t1), time: t1, a: null, b: 1 },
			{ date: new Date(t2), time: t2, a: 2, b: null }
		]);
	});

	it('maps stored nulls and missing ids to null alike', () => {
		const t1 = 1000;
		const maps = new Map([['a', new Map([[t1, /** @type {any} */ (null)]])]]);
		const rows = rowsFromSeriesMaps(maps, [t1], ['a', 'ghost']);
		expect(rows[0].a).toBeNull();
		expect(rows[0].ghost).toBeNull();
	});
});
