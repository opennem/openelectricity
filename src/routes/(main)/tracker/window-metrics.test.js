import { describe, expect, it } from 'vitest';
import { buildWindowMetrics, windowExtrema } from './window-metrics.js';

/** @param {Array<Record<string, any>>} data @param {string[]} [seriesNames] */
const snapshot = (data, seriesNames = ['coal', 'wind']) => ({
	queryKey: 'test',
	data,
	nativeData: [],
	start: 10,
	end: 40,
	seriesNames,
	seriesLabels: {},
	seriesColours: {}
});
const input = (
	/** @type {Partial<Parameters<typeof buildWindowMetrics>[0]>} */ overrides = {}
) => ({
	generation: null,
	demand: null,
	renewables: null,
	market: null,
	emissions: null,
	hidden: [],
	basis: /** @type {const} */ ('power'),
	priceMetric: /** @type {const} */ ('price'),
	emissionsMetric: /** @type {const} */ ('emissions_intensity'),
	...overrides
});

describe('display-window extrema', () => {
	it('retains signed values and chooses the earliest tied time independently of order', () => {
		const result = windowExtrema(
			snapshot([
				{ time: 30, coal: -4 },
				{ time: 10, coal: -4 },
				{ time: 20, coal: 0 }
			]),
			['coal']
		);
		expect(result.min).toEqual({ value: -4, time: 10, ties: 2 });
		expect(result.max).toEqual({ value: 0, time: 20, ties: 1 });
	});
	it('excludes synthetic and out-of-window points while including actual endpoints', () => {
		const result = windowExtrema(
			snapshot([
				{ time: 9, coal: -999 },
				{ time: 10, coal: 2 },
				{ time: 40, coal: 3 },
				{ time: 41, coal: 999 },
				{ time: 40, coal: 999, _bandClose: true }
			]),
			['coal']
		);
		expect(result.available).toBe(2);
		expect(result.min?.value).toBe(2);
		expect(result.max?.value).toBe(3);
	});
	it('rejects incomplete totals rather than inventing a smaller minimum', () => {
		const result = windowExtrema(
			snapshot([
				{ time: 10, coal: 10, wind: 5 },
				{ time: 20, coal: 4, wind: null },
				{ time: 30, wind: 1 },
				{ time: 40, coal: 0, wind: 0 }
			]),
			['coal', 'wind']
		);
		expect(result).toMatchObject({
			available: 2,
			intervals: 4,
			min: { value: 0 },
			max: { value: 15 }
		});
	});
	it('ignores non-numbers, non-finite values and non-finite timestamps', () => {
		const data = [null, undefined, NaN, Infinity, '4'].map((coal) => ({ time: 20, coal }));
		data.push({ time: NaN, coal: 4 });
		expect(windowExtrema(snapshot(data), ['coal']).min).toBeNull();
	});
	it('does not invent zero when no series or data are selected', () => {
		expect(windowExtrema(snapshot([{ time: 20, coal: 5 }]), []).min).toBeNull();
		expect(windowExtrema(null, ['coal']).max).toBeNull();
	});
	it('rejects overflow from individually finite members', () => {
		expect(
			windowExtrema(snapshot([{ time: 20, coal: Number.MAX_VALUE, wind: Number.MAX_VALUE }]), [
				'coal',
				'wind'
			]).max
		).toBeNull();
	});
});

describe('Tracker metrics', () => {
	it('uses the signed visible generation stack, including imports and loads', () => {
		const generation = snapshot(
			[{ time: 20, coal: 100, imports: 30, charging: -40 }],
			['coal', 'imports', 'charging']
		);
		expect(buildWindowMetrics(input({ generation }))[0].min?.value).toBe(90);
		expect(buildWindowMetrics(input({ generation, hidden: ['coal'] }))[0].min?.value).toBe(-10);
	});
	it('labels energy display buckets without pretending they are instantaneous power', () => {
		const result = buildWindowMetrics(
			input({ basis: 'energy', generation: snapshot([{ time: 20, coal: 24 }], ['coal']) })
		)[0];
		expect(result).toMatchObject({ label: 'Net energy', unit: 'MWh', max: { value: 24 } });
	});
	it('uses display buckets rather than native peaks or totals over overlapping rolling buckets', () => {
		const generation = {
			...snapshot(
				[
					{ time: 20, coal: 5 },
					{ time: 30, coal: 10 }
				],
				['coal']
			),
			nativeData: [{ time: 20, coal: 100 }]
		};
		expect(buildWindowMetrics(input({ generation }))[0].max?.value).toBe(10);
	});
	it('preserves negative regional prices and ignores technology visibility for price', () => {
		const market = snapshot(
			[
				{ time: 10, price: -75 },
				{ time: 20, price: 0 }
			],
			['price']
		);
		expect(buildWindowMetrics(input({ market, hidden: ['price'] }))[1]).toMatchObject({
			unit: '$/MWh',
			min: { value: -75 },
			max: { value: 0 }
		});
	});
	it('scopes market value and emissions volume to visible technologies', () => {
		const source = snapshot([{ time: 20, coal: 100, wind: 20 }]);
		const groups = buildWindowMetrics(
			input({
				market: source,
				emissions: source,
				priceMetric: 'market_value',
				emissionsMetric: 'emissions',
				hidden: ['coal']
			})
		);
		expect(groups[1]).toMatchObject({ unit: '$', min: { value: 20 } });
		expect(groups[4]).toMatchObject({ unit: 'tCO₂e', min: { value: 20 } });
	});
	it('derives volume-weighted price from display components and excludes zero denominators', () => {
		const market = snapshot(
			[
				{ time: 10, market_value: 1000, energy_mwh: 10 },
				{ time: 20, market_value: -100, energy_mwh: 20 },
				{ time: 30, market_value: 999, energy_mwh: 0 }
			],
			['market_value', 'energy_mwh']
		);
		expect(buildWindowMetrics(input({ market, priceMetric: 'price_vw' }))[1]).toMatchObject({
			available: 2,
			min: { value: -5 },
			max: { value: 100 }
		});
	});
	it('shows regional demand independently of technology visibility and excludes missing intervals', () => {
		const demand = snapshot(
			[
				{ time: 10, demand: 120 },
				{ time: 20, demand: 80 },
				{ time: 30, demand: null },
				{ time: 40, demand: 999, _bandClose: true }
			],
			['demand']
		);
		const groups = buildWindowMetrics(input({ demand, hidden: ['demand'] }));
		expect(groups[2]).toMatchObject({
			id: 'demand',
			unit: 'MW',
			available: 2,
			min: { value: 80, time: 20 },
			max: { value: 120, time: 10 }
		});
		expect(groups.map((group) => group.id)).toEqual([
			'generation',
			'market',
			'demand',
			'renewables'
		]);
		expect(buildWindowMetrics(input({ demand, basis: 'energy' }))[2].unit).toBe('MWh');
		expect(buildWindowMetrics(input())[2].min).toBeNull();
	});
	it('shows regional renewable share without filtering technologies or filling gaps', () => {
		const renewables = snapshot(
			[
				{ time: 10, renewable_share: 0 },
				{ time: 20, renewable_share: 83.5 },
				{ time: 30, renewable_share: null }
			],
			['renewable_share']
		);
		expect(buildWindowMetrics(input({ renewables, hidden: ['renewable_share'] }))[3]).toMatchObject(
			{
				unit: '%',
				available: 2,
				min: { value: 0 },
				max: { value: 83.5 }
			}
		);
	});
	it('preserves synthetic-row exclusions after deriving ratios', () => {
		const source = snapshot([
			{ time: 10, emissions: 1, market_value: 2, energy_mwh: 1 },
			{ time: 20, emissions: 9, market_value: 99, energy_mwh: 1, _bandClose: true }
		]);
		const groups = buildWindowMetrics(
			input({ market: source, emissions: source, priceMetric: 'price_vw' })
		);
		expect(groups[1].max?.value).toBe(2);
	});
});
