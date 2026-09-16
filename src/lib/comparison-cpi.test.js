import { describe, it, expect } from 'vitest';
import {
	adjustComparisonInflation,
	assertCpiCoverage,
	comparisonCpi,
	parseAbsCpi,
	validateCpiSnapshot
} from './comparison-cpi.js';
import { absCpiFixture, cpiSnapshot } from './comparison-cpi.fixtures.js';

describe('ABS CPI', () => {
	it('sorts SDMX observations by their time dimension, retaining the whole index base', () => {
		const result = parseAbsCpi(absCpiFixture());
		expect(result.observations).toEqual(cpiSnapshot().observations);
		expect(result.basePeriod).toBe(cpiSnapshot().basePeriod);
		expect(comparisonCpi(result).reference).toMatch(/\w+ \d{4}/);
	});
	it.each(['MEASURE', 'INDEX', 'TSEST', 'REGION', 'FREQ'])('rejects an unexpected %s', (id) => {
		const payload = absCpiFixture();
		const dimension = payload.data.structures[0].dimensions.series.find((d) => d.id === id);
		if (dimension) dimension.values[0].id = 'wrong';
		expect(() => parseAbsCpi(payload)).toThrow('Unexpected ABS CPI');
	});
	it('rejects missing, duplicate, future and invalid observations', () => {
		for (const mutate of [
			(/** @type {any} */ s) => s.observations.splice(3, 1),
			(/** @type {any} */ s) => s.observations.splice(3, 0, s.observations[3]),
			(/** @type {any} */ s) => {
				s.observations[3].value = null;
			},
			(/** @type {any} */ s) => {
				s.observations[3].value = 0;
			},
			(/** @type {any} */ s) => {
				s.observations.at(-1).period = '2999-Q1';
			}
		]) {
			const snapshot = cpiSnapshot();
			mutate(snapshot);
			expect(() => validateCpiSnapshot(snapshot)).toThrow();
		}
	});
	it('rejects truncated updates but accepts complete revisions and rebasing', () => {
		const previous = validateCpiSnapshot(cpiSnapshot());
		const next = structuredClone(previous);
		next.observations.pop();
		expect(() => assertCpiCoverage(next, previous)).toThrow('discard');
		const rebased = {
			...previous,
			basePeriod: 'New base',
			observations: previous.observations.map((r) => ({ ...r, value: r.value * 2 }))
		};
		expect(() => assertCpiCoverage(rebased, previous)).not.toThrow();
	});
	it('adjusts monthly dollar components with their quarter and leaves unpublished months blank', () => {
		const cpi = {
			values: [
				{ time: Date.UTC(2024, 0), value: 100 },
				{ time: Date.UTC(2024, 3), value: 120 }
			],
			source: '',
			fetchedAt: '',
			reference: 'June 2024'
		};
		const rows = [0, 2, 3, 5, 6].map((month) => ({
			time: Date.UTC(2024, month),
			market_value: 100
		}));
		expect(adjustComparisonInflation(rows, cpi).map((r) => r.market_value_real)).toEqual([
			120,
			120,
			100,
			100,
			null
		]);
		expect(
			adjustComparisonInflation([{ time: Date.UTC(2024, 0), market_value: -100 }], cpi)[0]
				.market_value_real
		).toBe(-120);
		expect(adjustComparisonInflation(rows, { ...cpi, values: [] })[0].market_value_real).toBeNull();
	});
});
