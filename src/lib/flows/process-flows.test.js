import { describe, expect, it } from 'vitest';
import { processFlowsJson, processPricesJson } from './process-flows.js';

/** @param {string} code @param {number[]} data @param {string} [last] */
const flowSeries = (code, data, last = '2026-07-24T12:30:00+10:00') => ({
	code,
	history: { last, data }
});

describe('processFlowsJson', () => {
	it('extracts the latest value per interconnector', () => {
		const result = processFlowsJson([
			flowSeries('NSW1->QLD1', [100, -250, 320]),
			flowSeries('SA1->VIC1', [-40, 55])
		]);

		expect(result.regionFlows).toEqual({ 'NSW1->QLD1': 320, 'SA1->VIC1': 55 });
		expect(result.dispatchDateTimeString).toBe('2026-07-24T12:30:00+10:00');
		expect(result.originalJsons).toHaveLength(2);
	});

	it('preserves signed (negative) flows', () => {
		const result = processFlowsJson([flowSeries('TAS1-VIC1', [10, -478])]);
		expect(result.regionFlows['TAS1-VIC1']).toBe(-478);
	});

	it('returns the empty shape when payload data is missing', () => {
		expect(processFlowsJson(null)).toEqual({
			dispatchDateTimeString: '',
			regionFlows: {},
			originalJsons: null
		});
	});
});

describe('processPricesJson', () => {
	it('extracts the latest price per region', () => {
		const result = processPricesJson([
			flowSeries('NSW1', [88.2, 104.5]),
			flowSeries('SA1', [12.0, -32.1])
		]);

		expect(result.regionPrices).toEqual({ NSW1: 104.5, SA1: -32.1 });
	});

	it('returns the empty shape when payload data is missing', () => {
		expect(processPricesJson(undefined)).toEqual({ regionPrices: {}, originalJsons: null });
	});
});
