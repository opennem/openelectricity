import { describe, expect, it } from 'vitest';
import { buildWindowMetrics, windowExtrema } from './window-metrics.js';

/** @param {ReturnType<typeof buildWindowMetrics>} groups @param {string} id */
const byId = (groups, id) =>
	/** @type {NonNullable<(typeof groups)[number]>} */ (groups.find((group) => group.id === id));

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

describe('net power and net energy per bucket', () => {
	const rows = [
		{ time: 10, coal: 100, wind: 20 },
		{ time: 20, coal: 100, wind: 40 },
		{ time: 30, coal: 100 }
	];
	it('shows only net power on a power basis: bucket energy would just rescale it', () => {
		const groups = buildWindowMetrics(
			input({ generation: snapshot(rows), basis: 'power', bucketHours: () => 0.5 })
		);
		expect(byId(groups, 'generation')).toMatchObject({
			label: 'Net power',
			unit: 'MW',
			min: { value: 120, time: 10 },
			max: { value: 140, time: 20 },
			available: 2,
			intervals: 3
		});
		expect(groups.map((group) => group.id)).not.toContain('energy');
	});
	it('keeps MWh buckets as net energy and derives average MW from each bucket length', () => {
		const groups = buildWindowMetrics(
			input({
				generation: snapshot(rows),
				basis: 'energy',
				bucketHours: (time) => (time === 10 ? 24 : 12)
			})
		);
		expect(byId(groups, 'energy')).toMatchObject({
			label: 'Net energy',
			unit: 'MWh',
			min: { value: 120, time: 10 },
			max: { value: 140, time: 20 }
		});
		expect(byId(groups, 'generation')).toMatchObject({
			min: { value: 5, time: 10 },
			max: { value: 140 / 12, time: 20 }
		});
		expect(groups.map((group) => group.id).slice(0, 3)).toEqual(['energy', 'generation', 'demand']);
	});
	it('excludes hidden technologies from both', () => {
		const groups = buildWindowMetrics(
			input({ generation: snapshot(rows), basis: 'energy', hidden: ['coal'] })
		);
		expect(byId(groups, 'energy').max?.value).toBe(40);
		expect(byId(groups, 'generation').max?.value).toBe(40);
	});
});

describe('curtailment extrema', () => {
	it('reads the two official series in the window basis, independent of visibility', () => {
		const curtailment = snapshot(
			[
				{ time: 10, curtailment_solar: 5, curtailment_wind: 50 },
				{ time: 20, curtailment_solar: 0, curtailment_wind: null }
			],
			['curtailment_solar', 'curtailment_wind']
		);
		const groups = buildWindowMetrics(input({ curtailment, hidden: ['wind'] }));
		expect(byId(groups, 'curtailment_solar')).toMatchObject({
			unit: 'MW',
			min: { value: 0, time: 20 },
			max: { value: 5, time: 10 },
			available: 2
		});
		expect(byId(groups, 'curtailment_wind')).toMatchObject({
			min: { value: 50 },
			max: { value: 50 },
			available: 1,
			intervals: 2
		});
		expect(
			byId(buildWindowMetrics(input({ curtailment, basis: 'energy' })), 'curtailment_wind').unit
		).toBe('MWh');
		expect(byId(buildWindowMetrics(input()), 'curtailment_solar').min).toBeNull();
	});
});

describe('Tracker metrics', () => {
	it('uses the signed visible generation stack, including imports and loads', () => {
		const generation = snapshot(
			[{ time: 20, coal: 100, imports: 30, charging: -40 }],
			['coal', 'imports', 'charging']
		);
		expect(byId(buildWindowMetrics(input({ generation })), 'generation').min?.value).toBe(90);
		expect(
			byId(buildWindowMetrics(input({ generation, hidden: ['coal'] })), 'generation').min?.value
		).toBe(-10);
	});
	it('keeps energy display buckets as energy and derives average power from them', () => {
		const groups = buildWindowMetrics(
			input({
				basis: 'energy',
				generation: snapshot([{ time: 20, coal: 24 }], ['coal']),
				bucketHours: () => 24
			})
		);
		expect(byId(groups, 'energy')).toMatchObject({
			label: 'Net energy',
			unit: 'MWh',
			max: { value: 24 }
		});
		expect(byId(groups, 'generation')).toMatchObject({
			label: 'Net power',
			unit: 'MW',
			max: { value: 1 }
		});
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
		expect(byId(buildWindowMetrics(input({ generation })), 'generation').max?.value).toBe(10);
	});
	it('preserves negative regional prices and ignores technology visibility for price', () => {
		const market = snapshot(
			[
				{ time: 10, price: -75 },
				{ time: 20, price: 0 }
			],
			['price']
		);
		expect(byId(buildWindowMetrics(input({ market, hidden: ['price'] })), 'market')).toMatchObject({
			unit: '$/MWh',
			min: { value: -75 },
			max: { value: 0 }
		});
	});
	it('scopes market value to visible technologies', () => {
		const source = snapshot([{ time: 20, coal: 100, wind: 20 }]);
		const groups = buildWindowMetrics(
			input({ market: source, priceMetric: 'market_value', hidden: ['coal'] })
		);
		expect(byId(groups, 'market')).toMatchObject({ unit: '$', min: { value: 20 } });
	});
	it('reads emissions volume and intensity from the components feed, as ratios of sums', () => {
		const emissions = snapshot(
			[
				{ time: 10, emissions: 50, energy_mwh: 100 },
				{ time: 20, emissions: 20, energy_mwh: 40 },
				{ time: 30, emissions: 30, energy_mwh: 0 },
				{ time: 40, emissions: null, energy_mwh: 10 }
			],
			['emissions', 'energy_mwh']
		);
		const groups = buildWindowMetrics(input({ emissions }));
		expect(byId(groups, 'emissions')).toMatchObject({
			unit: 'tCO₂e',
			min: { value: 20, time: 20 },
			max: { value: 50, time: 10 },
			available: 3,
			intervals: 4
		});
		// 50 t over 100 MWh and 20 t over 40 MWh are both 500 kg/MWh; the
		// zero-energy bucket has no intensity.
		expect(byId(groups, 'intensity')).toMatchObject({
			unit: 'kgCO₂e/MWh',
			min: { value: 500, time: 10, ties: 2 },
			max: { value: 500, time: 10, ties: 2 },
			available: 2,
			intervals: 4
		});
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
		expect(
			byId(buildWindowMetrics(input({ market, priceMetric: 'price_vw' })), 'market')
		).toMatchObject({
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
		expect(byId(groups, 'demand')).toMatchObject({
			id: 'demand',
			unit: 'MW',
			available: 2,
			min: { value: 80, time: 20 },
			max: { value: 120, time: 10 }
		});
		expect(groups.map((group) => group.id)).toEqual([
			'generation',
			'demand',
			'renewables',
			'market',
			'emissions',
			'intensity',
			'curtailment_solar',
			'curtailment_wind'
		]);
		expect(byId(buildWindowMetrics(input({ demand, basis: 'energy' })), 'demand').unit).toBe('MWh');
		expect(byId(buildWindowMetrics(input()), 'demand').min).toBeNull();
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
		expect(
			byId(buildWindowMetrics(input({ renewables, hidden: ['renewable_share'] })), 'renewables')
		).toMatchObject({
			unit: '%',
			available: 2,
			min: { value: 0 },
			max: { value: 83.5 }
		});
	});
	it('preserves synthetic-row exclusions after deriving ratios', () => {
		const source = snapshot([
			{ time: 10, emissions: 1, market_value: 2, energy_mwh: 1 },
			{ time: 20, emissions: 9, market_value: 99, energy_mwh: 1, _bandClose: true }
		]);
		const groups = buildWindowMetrics(
			input({ market: source, emissions: source, priceMetric: 'price_vw' })
		);
		expect(byId(groups, 'market').max?.value).toBe(2);
	});
});
