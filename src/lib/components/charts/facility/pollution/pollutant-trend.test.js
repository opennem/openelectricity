import { describe, it, expect } from 'vitest';
import { computePollutantTrend } from './pollutant-trend.js';

describe('computePollutantTrend', () => {
	it('returns null when there are fewer than 2 prior values', () => {
		expect(computePollutantTrend([])).toBeNull();
		expect(computePollutantTrend([100])).toBeNull();
		expect(computePollutantTrend([null, 100])).toBeNull();
		expect(computePollutantTrend([null, null, 100])).toBeNull();
	});

	it('returns null when the latest value is null', () => {
		expect(computePollutantTrend([100, 110, null])).toBeNull();
	});

	it('returns null when the prior-window average is zero', () => {
		expect(computePollutantTrend([0, 0, 0, 50])).toBeNull();
	});

	it('reports "up" when latest is more than 5% above the 5y average', () => {
		const trend = computePollutantTrend([100, 100, 100, 100, 100, 110]);
		expect(trend?.direction).toBe('up');
		expect(trend?.delta).toBeCloseTo(0.1, 6);
	});

	it('reports "down" when latest is more than 5% below the 5y average', () => {
		const trend = computePollutantTrend([100, 100, 100, 100, 100, 80]);
		expect(trend?.direction).toBe('down');
		expect(trend?.delta).toBeCloseTo(-0.2, 6);
	});

	it('reports "flat" within ±5%', () => {
		expect(computePollutantTrend([100, 100, 100, 100, 100, 102])?.direction).toBe('flat');
		expect(computePollutantTrend([100, 100, 100, 100, 100, 98])?.direction).toBe('flat');
	});

	it('uses only the preceding 5 years even when older history exists', () => {
		// First entry (1) is older than the 5y window — should be ignored.
		const trend = computePollutantTrend([1, 100, 100, 100, 100, 100, 110]);
		expect(trend?.average).toBe(100);
		expect(trend?.delta).toBeCloseTo(0.1, 6);
	});

	it('skips nulls inside the prior window', () => {
		const trend = computePollutantTrend([100, null, 100, null, 100, 110]);
		expect(trend?.average).toBe(100);
		expect(trend?.direction).toBe('up');
	});
});
