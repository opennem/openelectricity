import { describe, it, expect } from 'vitest';
import { getFilterParams, defaultSignificance, parseListParam } from './filters.js';

/** @param {number | null | undefined} significance */
function paramsWithSignificance(significance) {
	return getFilterParams({
		regions: [],
		periods: [],
		fuelTechs: [],
		stringFilter: '',
		aggregates: [],
		metrics: [],
		significance
	});
}

describe('getFilterParams significance', () => {
	it('omits the param when significance equals the default', () => {
		expect(paramsWithSignificance(defaultSignificance).significanceParam).toBe('');
	});

	it('omits the param when significance is null or undefined', () => {
		expect(paramsWithSignificance(null).significanceParam).toBe('');
		expect(paramsWithSignificance(undefined).significanceParam).toBe('');
	});

	it('encodes 0 (all records) explicitly so it survives a reload', () => {
		expect(paramsWithSignificance(0).significanceParam).toBe('&significance=0');
	});

	it('encodes non-default values', () => {
		expect(paramsWithSignificance(9).significanceParam).toBe('&significance=9');
	});
});

describe('parseListParam', () => {
	it('returns an empty list for a missing or empty param', () => {
		expect(parseListParam(null)).toEqual([]);
		expect(parseListParam('')).toEqual([]);
	});

	it('splits comma-separated values in order', () => {
		expect(parseListParam('nsw1,vic1')).toEqual(['nsw1', 'vic1']);
	});

	it('drops duplicates, blanks and surrounding whitespace', () => {
		expect(parseListParam('nsw1, vic1,nsw1,,vic1 ')).toEqual(['nsw1', 'vic1']);
	});
});
