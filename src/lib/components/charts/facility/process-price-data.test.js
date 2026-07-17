import { describe, it, expect } from 'vitest';
import { processPriceData } from './process-price-data.js';
import { LINE_COLOUR } from './colours.js';

/**
 * Behaviour lock for processPriceData, written against the pre-refactor
 * implementation: real API timestamps, union + lookup, nulls stored as-is,
 * no load inversion, unit-code label suffixes.
 */

const response = (/** @type {any[]} */ results, metric = 'price') => ({
	data: [{ metric, results }]
});

describe('processPriceData', () => {
	it('returns null for missing or empty responses', () => {
		expect(processPriceData(null, {})).toBeNull();
		expect(processPriceData({}, {})).toBeNull();
		expect(processPriceData(response([]), {})).toBeNull();
		// A series with no data points is dropped; nothing left → null
		expect(processPriceData(response([{ name: 'price', data: [] }]), {})).toBeNull();
	});

	it('parses timestamps against the network offset and sorts rows', () => {
		const result = processPriceData(
			response([
				{
					name: 'price',
					data: [
						['2026-01-21T01:05:00', 55.5],
						['2026-01-21T01:00:00', 42.0]
					]
				}
			]),
			{ networkTimezone: '+10:00' }
		);

		expect(result).not.toBeNull();
		expect(result?.seriesNames).toEqual(['price']);
		expect(result?.data.map((r) => r.time)).toEqual([
			new Date('2026-01-21T01:00:00+10:00').getTime(),
			new Date('2026-01-21T01:05:00+10:00').getTime()
		]);
		expect(result?.data[0].price).toBe(42.0);
		expect(result?.data[1].price).toBe(55.5);
		expect(result?.data[0].date).toBeInstanceOf(Date);
	});

	it('keeps null values and fills missing timestamps with null across series', () => {
		const result = processPriceData(
			response([
				{
					name: 'a',
					data: [
						['2026-01-21T01:00:00', null],
						['2026-01-21T01:05:00', 10]
					]
				},
				{ name: 'b', data: [['2026-01-21T01:05:00', 20]] }
			]),
			{}
		);

		// Null value rows still contribute their timestamp to the union
		expect(result?.data).toHaveLength(2);
		expect(result?.data[0].a).toBeNull();
		expect(result?.data[0].b).toBeNull(); // absent for b at this ts
		expect(result?.data[1].a).toBe(10);
		expect(result?.data[1].b).toBe(20);
	});

	it('does not invert negative values (no load handling for price)', () => {
		const result = processPriceData(
			response([{ name: 'price', data: [['2026-01-21T01:00:00', -60]] }]),
			{}
		);
		expect(result?.data[0].price).toBe(-60);
	});

	it('filters to the requested metric', () => {
		const resp = {
			data: [
				{ metric: 'price', results: [{ name: 'price', data: [['2026-01-21T01:00:00', 42]] }] },
				{ metric: 'energy', results: [{ name: 'energy_x', data: [['2026-01-21T01:00:00', 1]] }] }
			]
		};
		const result = processPriceData(resp, { metricFilter: 'price' });
		expect(result?.seriesNames).toEqual(['price']);
	});

	it('labels series with the unit code when present, default otherwise', () => {
		const result = processPriceData(
			response([
				{ name: 'price_U1', columns: { unit_code: 'U1' }, data: [['2026-01-21T01:00:00', 1]] },
				{ name: 'price', data: [['2026-01-21T01:00:00', 2]] }
			]),
			{}
		);
		expect(result?.seriesLabels.price_U1).toBe('Price ($/MWh) — U1');
		expect(result?.seriesLabels.price).toBe('Price ($/MWh)');
	});

	it('applies the default line colour and honours overrides', () => {
		const base = processPriceData(
			response([{ name: 'price', data: [['2026-01-21T01:00:00', 1]] }]),
			{}
		);
		expect(base?.seriesColours.price).toBe(LINE_COLOUR);

		const custom = processPriceData(
			response([{ name: 'price', data: [['2026-01-21T01:00:00', 1]] }]),
			{ colour: '#123456', label: 'Spot' }
		);
		expect(custom?.seriesColours.price).toBe('#123456');
		expect(custom?.seriesLabels.price).toBe('Spot');
	});

	it('falls back to the metric name when a series has no name', () => {
		const result = processPriceData(response([{ data: [['2026-01-21T01:00:00', 5]] }]), {});
		expect(result?.seriesNames).toEqual(['price']);
	});

	it('skips unparseable timestamps', () => {
		const result = processPriceData(
			response([
				{
					name: 'price',
					data: [
						['not-a-date', 1],
						['2026-01-21T01:00:00', 2]
					]
				}
			]),
			{}
		);
		expect(result?.data).toHaveLength(1);
		expect(result?.data[0].price).toBe(2);
	});
});
