import { afterEach, describe, expect, it, vi } from 'vitest';
import { lastTwelveMonths, summariseAnnual, summariseLive } from './system-snapshot-summary.js';

const M1 = '2026-08-01T00:00:00+10:00';
const M2 = '2026-09-01T00:00:00+10:00';

/** @param {string} region @param {string} fueltech @param {Array<[string, number | null]>} data */
const fuelSeries = (region, fueltech, data) => ({
	columns: region ? { region, fueltech } : { fueltech },
	data
});
/** @param {string} region @param {Array<[string, number | null]>} data */
const regionSeries = (region, data) => ({ columns: region ? { region } : {}, data });

describe('summariseAnnual', () => {
	const generation = {
		data: [
			{
				metric: 'emissions',
				results: [
					fuelSeries('SA1', 'gas_ccgt', [
						[M1, 300],
						[M2, 200]
					]),
					fuelSeries('SA1', 'wind', [
						[M1, 0],
						[M2, 0]
					])
				]
			},
			{
				metric: 'energy',
				results: [
					fuelSeries('SA1', 'wind', [
						[M1, 600],
						[M2, 400]
					]),
					fuelSeries('SA1', 'gas_ccgt', [
						[M1, 500],
						[M2, null]
					]),
					// A load: in intensity's energy, not in generation.
					fuelSeries('SA1', 'battery_charging', [[M1, 250]]),
					// The net aggregate would double-count the splits.
					fuelSeries('SA1', 'battery', [[M1, -9999]])
				]
			}
		]
	};
	const renewables = {
		data: [
			{
				metric: 'generation_renewable_energy',
				results: [
					regionSeries('SA1', [
						[M1, 700],
						[M2, 500]
					])
				]
			},
			{
				metric: 'demand_gross_energy',
				results: [
					regionSeries('SA1', [
						[M1, 1000],
						[M2, 1000]
					])
				]
			}
		]
	};

	it('sums source generation, skipping loads, the net battery and missing months', () => {
		// wind 1000 + gas 500 MWh = 1.5 GWh
		expect(summariseAnnual(generation, renewables).SA.generation).toBeCloseTo(1.5);
	});

	it('applies OE renewable proportion over the window: renewables ÷ gross demand', () => {
		// (700 + 500) / (1000 + 1000)
		expect(summariseAnnual(generation, renewables).SA.renewables).toBeCloseTo(60);
	});

	it('counts only periods where both renewables and gross demand were reported', () => {
		const partial = structuredClone(renewables);
		partial.data[1].results[0].data[1][1] = null;
		expect(summariseAnnual(generation, partial).SA.renewables).toBeCloseTo(70);
	});

	it('divides emissions by every fuel tech energy, loads included, in kg/MWh', () => {
		// 500 t / (1000 + 500 + 250) MWh
		expect(summariseAnnual(generation, renewables).SA.intensity).toBeCloseTo((500 / 1750) * 1000);
	});

	it('files a response not split by NEM region under the fallback id', () => {
		const wemGeneration = {
			data: [{ metric: 'energy', results: [fuelSeries('', 'wind', [[M1, 2000]])] }]
		};
		const wemRenewables = {
			data: [
				{ metric: 'generation_renewable_energy', results: [regionSeries('', [[M1, 500]])] },
				{ metric: 'demand_gross_energy', results: [regionSeries('', [[M1, 2500]])] }
			]
		};
		expect(summariseAnnual(wemGeneration, wemRenewables, 'WA')).toEqual({
			WA: { generation: 2, renewables: 20, intensity: 0 }
		});
	});
});

describe('summariseLive', () => {
	const T1 = '2026-10-09T11:20:00+10:00';
	const T2 = '2026-10-09T11:25:00+10:00';
	const T3 = '2026-10-09T11:30:00+10:00';
	const power = {
		data: [
			{
				metric: 'power',
				results: [
					fuelSeries('SA1', 'wind', [
						[T1, 100],
						[T2, 110],
						[T3, 999]
					]),
					// Step-held rooftop: empty at T2, carried from T1.
					fuelSeries('SA1', 'solar_rooftop', [
						[T1, 50],
						[T2, null]
					]),
					fuelSeries('SA1', 'battery_charging', [[T2, 30]]),
					fuelSeries('SA1', 'battery', [[T2, -20]])
				]
			}
		]
	};
	const proportions = {
		data: [
			{
				metric: 'renewable_proportion',
				results: [
					regionSeries('SA1', [
						[T1, 61.5],
						[T2, 62.42],
						[T3, null]
					])
				]
			}
		]
	};

	it('shows the latest published renewable proportion as-is', () => {
		expect(summariseLive(power, proportions).SA.renewables).toBe(62.42);
	});

	it('reads source generation at that same interval', () => {
		// wind 110 + rooftop carried 50; the load and the net battery are left out
		expect(summariseLive(power, proportions).SA.generation).toBe(160);
	});

	it('leaves regions without readings empty', () => {
		expect(summariseLive(power, proportions).NSW).toEqual({ generation: null, renewables: null });
	});
});

describe('lastTwelveMonths', () => {
	afterEach(() => vi.useRealTimers());

	it('spans the 12 complete months before the current local month', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-09T01:00:00Z'));
		expect(lastTwelveMonths('+10:00')).toEqual({
			dateStart: '2025-10-01T00:00:00',
			dateEnd: '2026-10-01T00:00:00'
		});
	});

	it('uses the network-local month at the turn of a month', () => {
		vi.useFakeTimers();
		// 31 Oct 15:00 UTC is 1 Nov in the NEM but still 31 Oct in the WEM.
		vi.setSystemTime(new Date('2026-10-31T15:00:00Z'));
		expect(lastTwelveMonths('+10:00').dateEnd).toBe('2026-11-01T00:00:00');
		expect(lastTwelveMonths('+08:00').dateEnd).toBe('2026-10-01T00:00:00');
	});
});
