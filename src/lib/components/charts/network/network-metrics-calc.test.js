import { describe, it, expect } from 'vitest';
import {
	sumAsEnergy,
	pairedShare,
	meanSeries,
	averagePower,
	maxSeries,
	buildNetworkMetricsContext
} from './network-metrics-calc.js';

const HOUR = 3_600_000;

/**
 * Build uniform-interval rows from per-key value arrays.
 * @param {Record<string, Array<number | null>>} series
 * @param {number} intervalMs
 */
function rows(series, intervalMs) {
	const keys = Object.keys(series);
	const length = series[keys[0]].length;
	return Array.from({ length }, (_, i) => {
		/** @type {Record<string, any>} */
		const row = { time: i * intervalMs, date: new Date(i * intervalMs) };
		for (const key of keys) row[key] = series[key][i];
		return row;
	});
}

describe('sumAsEnergy', () => {
	it('multiplies power rows by their own interval length', () => {
		// Four 30m buckets of 100 MW = 2 hours × 100 MW = 200 MWh
		const data = rows({ coal_black: [100, 100, 100, 100] }, HOUR / 2);
		expect(sumAsEnergy(data, ['coal_black'], 'power')).toBe(200);
	});

	it('normalises mixed grains onto comparable energy', () => {
		// The same 2h window at 5m grain must produce the same MWh as at 30m.
		const fine = rows({ wind: Array(24).fill(100) }, HOUR / 12);
		const coarse = rows({ wind: Array(4).fill(100) }, HOUR / 2);
		expect(sumAsEnergy(fine, ['wind'], 'power')).toBe(sumAsEnergy(coarse, ['wind'], 'power'));
	});

	it('sums energy rows directly', () => {
		const data = rows({ coal_black: [500, 600] }, 24 * HOUR);
		expect(sumAsEnergy(data, ['coal_black'], 'energy')).toBe(1100);
	});

	it('skips nulls and returns 0 for a single row (no measurable interval)', () => {
		const data = rows({ wind: [100, null, 100] }, HOUR / 2);
		expect(sumAsEnergy(data, ['wind'], 'power')).toBe(100);
		expect(sumAsEnergy([{ time: 0, wind: 100 }], ['wind'], 'power')).toBe(0);
	});
});

describe('pairedShare', () => {
	it('divides the numerator sum by the denominator sum', () => {
		const data = rows({ renewables: [40, 60], demand_gross: [100, 100] }, HOUR / 12);
		expect(pairedShare(data, 'renewables', 'demand_gross')).toEqual({ pct: 50, trimmed: false });
	});

	it('drops numerator rows without a paired denominator and reports the trim', () => {
		// Gross demand is null before May 2006 while renewables data runs from
		// 1999 — unpaired renewables must not inflate the share.
		const data = rows({ renewables: [1000, 40, 60], demand_gross: [null, 100, 100] }, HOUR / 12);
		expect(pairedShare(data, 'renewables', 'demand_gross')).toEqual({ pct: 50, trimmed: true });
	});

	it('returns null when the denominator never appears', () => {
		const data = rows({ renewables: [40, 60], demand_gross: [null, null] }, HOUR / 12);
		expect(pairedShare(data, 'renewables', 'demand_gross').pct).toBeNull();
	});
});

describe('meanSeries / averagePower', () => {
	it('averages finite values only', () => {
		const data = rows({ price: [50, null, 150] }, HOUR / 12);
		expect(meanSeries(data, 'price')).toBe(100);
		expect(meanSeries(data, 'missing')).toBeNull();
	});

	it('returns the plain mean at power basis and divides by bucket length at energy basis', () => {
		const power = rows({ demand_gross: [1000, 2000] }, HOUR / 12);
		expect(averagePower(power, 'demand_gross', 'power')).toBe(1500);

		// Two daily buckets of 24,000 MWh each = 1,000 MW average
		const energy = rows({ demand_gross: [24000, 24000] }, 24 * HOUR);
		expect(averagePower(energy, 'demand_gross', 'energy')).toBe(1000);
	});
});

describe('maxSeries', () => {
	it('finds the highest finite value with its time', () => {
		const data = rows({ demand_gross: [100, null, 300, 200] }, HOUR / 12);
		expect(maxSeries(data, 'demand_gross')).toEqual({ value: 300, time: 2 * (HOUR / 12) });
	});

	it('returns null on empty input', () => {
		expect(maxSeries([], 'demand_gross')).toBeNull();
	});
});

describe('buildNetworkMetricsContext', () => {
	// 2h window: generation at 30m display grain, market pair + price at 5m.
	const generationRows = rows(
		{
			coal_black: [1000, 1000, 1000, 1000],
			wind: [500, 500, 500, 500],
			imports: [100, 100, 100, 100],
			battery_charging: [-50, -50, -50, -50]
		},
		HOUR / 2
	);
	const marketRows = rows(
		{
			renewables: Array(24).fill(800),
			demand_gross: Array(24).fill(2000)
		},
		HOUR / 12
	);
	const priceRows = rows({ price: Array(24).fill(120) }, HOUR / 12);

	const ctx = buildNetworkMetricsContext({
		generationRows,
		generationSeriesNames: ['coal_black', 'wind', 'imports', 'battery_charging'],
		marketRows,
		priceRows,
		priceSeriesNames: ['price'],
		basis: 'power',
		formatPeriodLabel: (t) => `t=${t}`
	});

	it('computes the renewables share from the paired market series', () => {
		expect(ctx.renewablesPct).toBe(40);
		expect(ctx.renewablesTrimmed).toBe(false);
	});

	it('computes the fossil share across differently-grained row sets', () => {
		// Fossil: 1000 MW × 2h = 2000 MWh; demand: 2000 MW × 2h = 4000 MWh → 50%.
		// A naive row-count sum (4 fossil rows vs 24 demand rows) would be wrong.
		expect(ctx.fossilPct).toBeCloseTo(50, 5);
	});

	it('excludes imports and loads from total generation', () => {
		// coal 1000 + wind 500 = 1500 MW × 2h = 3000 MWh
		expect(ctx.generationMWh).toBe(3000);
	});

	it('carries demand, peak and price through', () => {
		expect(ctx.demandAvgMW).toBe(2000);
		expect(ctx.peakDemand).toMatchObject({ value: 2000, isPower: true, periodLabel: 't=0' });
		expect(ctx.avgPrice).toBe(120);
	});

	it('nulls market-dependent metrics when the pair is missing', () => {
		const empty = buildNetworkMetricsContext({
			generationRows,
			generationSeriesNames: ['coal_black', 'wind'],
			marketRows: [],
			priceRows: [],
			priceSeriesNames: [],
			basis: 'power'
		});
		expect(empty.renewablesPct).toBeNull();
		expect(empty.fossilPct).toBeNull();
		expect(empty.demandAvgMW).toBeNull();
		expect(empty.peakDemand).toBeNull();
		expect(empty.avgPrice).toBeNull();
	});
});
