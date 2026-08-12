import { describe, it, expect } from 'vitest';
import { auUpstreamRanges, mergeAuResponses } from './network-data-au.js';

/**
 * @param {string} metric
 * @param {Array<{ fueltech: string, rows: Array<[string, number]> }>} defs
 */
function response(metric, defs) {
	return {
		data: [
			{
				metric,
				results: defs.map(({ fueltech, rows }) => ({
					name: `${metric}_${fueltech}`,
					columns: { fueltech },
					data: rows
				}))
			}
		]
	};
}

describe('auUpstreamRanges', () => {
	it('shifts the WEM window −2h at sub-daily grains', () => {
		const { nem, wem } = auUpstreamRanges('5m', '2026-08-05T00:00:00', '2026-08-06T00:00:00');
		expect(nem).toEqual({ dateStart: '2026-08-05T00:00:00', dateEnd: '2026-08-06T00:00:00' });
		expect(wem).toEqual({ dateStart: '2026-08-04T22:00:00', dateEnd: '2026-08-05T22:00:00' });
	});

	it('passes daily+ windows through unchanged', () => {
		const { nem, wem } = auUpstreamRanges('1d', '2026-07-01T00:00:00', '2026-08-01T00:00:00');
		expect(wem).toEqual(nem);
	});

	it('tolerates undefined dates', () => {
		const { wem } = auUpstreamRanges('5m', undefined, undefined);
		expect(wem).toEqual({ dateStart: undefined, dateEnd: undefined });
	});
});

describe('mergeAuResponses', () => {
	const nem = response('power', [
		{
			fueltech: 'coal_black',
			rows: [
				['2026-08-05T12:00:00+10:00', 5000],
				['2026-08-05T12:05:00+10:00', 5100]
			]
		}
	]);

	it('relabels sub-daily WEM rows onto the same real instant in AEST', () => {
		const wem = response('power', [
			{
				fueltech: 'coal_black',
				rows: [
					['2026-08-05T10:00:00+08:00', 800],
					['2026-08-05T10:05:00+08:00', 820]
				]
			}
		]);
		const merged = mergeAuResponses(nem, wem, '5m');
		expect(merged.data).toHaveLength(1);
		expect(merged.data[0].results).toHaveLength(2);
		// 10:00+08:00 is the same instant as 12:00+10:00.
		expect(merged.data[0].results[1].data).toEqual([
			['2026-08-05T12:00:00+10:00', 800],
			['2026-08-05T12:05:00+10:00', 820]
		]);
	});

	it('trims the merged sub-daily series to the common latest timestamp', () => {
		// NEM runs to 12:05; WEM only to 11:55 AEST-equivalent → cut at 11:55.
		const wem = response('power', [
			{
				fueltech: 'coal_black',
				rows: [
					['2026-08-05T09:50:00+08:00', 800],
					['2026-08-05T09:55:00+08:00', 820]
				]
			}
		]);
		const shortNem = response('power', [
			{
				fueltech: 'coal_black',
				rows: [
					['2026-08-05T11:50:00+10:00', 5000],
					['2026-08-05T11:55:00+10:00', 5050],
					['2026-08-05T12:00:00+10:00', 5100],
					['2026-08-05T12:05:00+10:00', 5150]
				]
			}
		]);
		const merged = mergeAuResponses(shortNem, wem, '5m');
		const nemRows = merged.data[0].results[0].data;
		const wemRows = merged.data[0].results[1].data;
		expect(nemRows.map((/** @type {[string, number]} */ [t]) => t)).toEqual([
			'2026-08-05T11:50:00+10:00',
			'2026-08-05T11:55:00+10:00'
		]);
		expect(wemRows).toHaveLength(2);
	});

	it('concatenates daily rows untouched (calendar-date join)', () => {
		const nemDaily = response('energy', [
			{ fueltech: 'coal_black', rows: [['2026-08-05T00:00:00+10:00', 120000]] }
		]);
		const wemDaily = response('energy', [
			{ fueltech: 'coal_black', rows: [['2026-08-05T00:00:00+08:00', 19000]] }
		]);
		const merged = mergeAuResponses(nemDaily, wemDaily, '1d');
		expect(merged.data[0].results[1].data).toEqual([['2026-08-05T00:00:00+08:00', 19000]]);
	});

	it('returns the NEM response untouched when WEM is missing or empty', () => {
		expect(mergeAuResponses(nem, null, '5m')).toBe(nem);
		expect(mergeAuResponses(nem, { data: [] }, '5m')).toBe(nem);
	});

	it('falls back to the (relabelled) WEM data when NEM is empty', () => {
		const wem = response('power', [
			{ fueltech: 'coal_black', rows: [['2026-08-05T10:00:00+08:00', 800]] }
		]);
		const merged = mergeAuResponses({ data: [] }, wem, '5m');
		expect(merged.data[0].results[0].data[0][0]).toBe('2026-08-05T12:00:00+10:00');
	});

	it('appends WEM-only metrics whole', () => {
		const wemExtra = {
			data: [
				...response('power', [
					{ fueltech: 'coal_black', rows: [['2026-08-05T10:05:00+08:00', 800]] }
				]).data,
				...response('emissions', [
					{ fueltech: 'coal_black', rows: [['2026-08-05T10:05:00+08:00', 60]] }
				]).data
			]
		};
		const merged = mergeAuResponses(nem, wemExtra, '5m');
		expect(merged.data.map((/** @type {any} */ e) => e.metric)).toEqual(['power', 'emissions']);
	});
});
