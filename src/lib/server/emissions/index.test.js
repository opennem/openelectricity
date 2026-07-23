import { describe, it, expect } from 'vitest';
import { getEmissions, EMISSIONS_PERIODS } from './index.js';

describe('getEmissions', () => {
	it('returns null for an unknown period', () => {
		expect(getEmissions('decade')).toBeNull();
	});

	it.each(EMISSIONS_PERIODS)('returns a populated, attributed payload for "%s"', (period) => {
		const result = getEmissions(period);
		expect(result).not.toBeNull();
		expect(result?.source?.label).toBeTruthy();
		expect(result?.source?.url).toBeTruthy();
		expect(Array.isArray(result?.data)).toBe(true);
		expect(result?.data.length).toBeGreaterThan(0);
	});

	it('quarter rows are keyed by sector with a Quarter column (values kept as strings)', () => {
		const result = getEmissions('quarter');
		const row = result?.data[0];
		expect(row).toHaveProperty('Quarter');
		expect(row).toHaveProperty('Electricity');
		expect(typeof row?.Electricity).toBe('string');
	});

	it('year payload exposes a numeric projectionStartYear and per-sector rows', () => {
		const result = getEmissions('year');
		expect(typeof result?.projectionStartYear).toBe('number');
		expect(result?.data[0]).toHaveProperty('Sector');
	});
});
