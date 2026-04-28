import { describe, it, expect } from 'vitest';
import {
	calculateRenewables,
	RENEWABLE_MODES,
	FOSSIL_ID,
	RENEWABLES_ID,
	TOTAL_ID
} from './calculate-renewables.js';

const START_YEAR = 2020;
const START_MONTH = 1;
const START = `${START_YEAR}-${String(START_MONTH).padStart(2, '0')}-01T00:00:00+10:00`;

/**
 * Build start/last ISO month strings spanning N consecutive months from START.
 * @param {number} n
 * @returns {{ start: string, last: string }}
 */
function rangeMeta(n) {
	const totalMonths = START_YEAR * 12 + (START_MONTH - 1) + (n - 1);
	const lastYear = Math.floor(totalMonths / 12);
	const lastMonth = (totalMonths % 12) + 1;
	const last = `${lastYear}-${String(lastMonth).padStart(2, '0')}-01T00:00:00+10:00`;
	return { start: START, last };
}

/**
 * @param {string} fuelTech
 * @param {Array<number | null>} data
 * @returns {StatsData}
 */
function makeFueltech(fuelTech, data) {
	const { start, last } = rangeMeta(data.length);
	return /** @type {StatsData} */ ({
		id: `au.fuel_tech.${fuelTech}.energy`,
		type: 'energy',
		fuel_tech: /** @type {FuelTechCode} */ (fuelTech),
		data_type: 'energy',
		units: 'GWh',
		network: 'NEM',
		history: { start, last, interval: '1M', data }
	});
}

/**
 * @param {string} metric
 * @param {Array<number | null>} data
 * @returns {StatsData}
 */
function makeMarket(metric, data) {
	const { start, last } = rangeMeta(data.length);
	return /** @type {StatsData} */ ({
		id: `au.fuel_tech..${metric}`,
		type: metric,
		fuel_tech: /** @type {FuelTechCode} */ (''),
		data_type: metric,
		units: 'GWh',
		network: 'NEM',
		history: { start, last, interval: '1M', data }
	});
}

/** 24 months of constant values so 12-month rolling sums are easy to predict. */
const N = 24;
/** @param {number} v */
const constArr = (v) => new Array(N).fill(v);

describe('RENEWABLE_MODES', () => {
	it('exposes the six modes in the expected order with legacy first', () => {
		expect(RENEWABLE_MODES.map((m) => m.id)).toEqual([
			'legacy_opennem',
			'current',
			'oe_secondary_renewable',
			'current_gross_demand',
			'oe_proportion',
			'oe_with_storage'
		]);
	});
});

describe('calculateRenewables — empty / invalid inputs', () => {
	it('returns empty result for null input', () => {
		// @ts-expect-error testing null input
		const out = calculateRenewables(null, 'current');
		expect(out.dataset).toEqual([]);
		expect(out.statsDatasets).toEqual([]);
	});

	it('returns empty result when fueltechStats is empty in current mode', () => {
		const out = calculateRenewables({ fueltechStats: [], marketStats: [] }, 'current');
		expect(out.dataset).toEqual([]);
	});

	it('returns empty result when market metrics are missing in oe_proportion mode', () => {
		const out = calculateRenewables({ fueltechStats: [], marketStats: [] }, 'oe_proportion');
		expect(out.dataset).toEqual([]);
	});

	it('throws on unknown mode', () => {
		expect(() =>
			calculateRenewables({ fueltechStats: [], marketStats: [] }, /** @type {any} */ ('bogus'))
		).toThrow(/Unknown renewable mode/);
	});
});

describe('calculateRenewables — legacy_opennem mode', () => {
	it('uses legacyFueltechStats and applies the same calculation as `current`', () => {
		const legacyFueltechStats = [
			makeFueltech('coal_black', constArr(100)),
			makeFueltech('gas_ccgt', constArr(50)),
			makeFueltech('wind', constArr(30)),
			makeFueltech('solar_utility', constArr(20)),
			makeFueltech('exports', constArr(10))
		];

		// Pass empty fueltechStats (the OE API source) — only legacy is used
		const out = calculateRenewables(
			{ fueltechStats: [], marketStats: [], legacyFueltechStats },
			'legacy_opennem'
		);

		expect(out.statsDatasets.map((d) => d.id)).toEqual([FOSSIL_ID, RENEWABLES_ID, TOTAL_ID]);

		const last = out.dataset[out.dataset.length - 1];
		// Same numbers as the `current` mode test below: fossil 75%, renewables 25%
		expect(last[FOSSIL_ID]).toBeCloseTo(75, 5);
		expect(last[RENEWABLES_ID]).toBeCloseTo(25, 5);
	});

	it('returns empty when legacyFueltechStats is missing', () => {
		const out = calculateRenewables(
			{ fueltechStats: [], marketStats: [] },
			'legacy_opennem'
		);
		expect(out.dataset).toEqual([]);
	});
});

describe('calculateRenewables — current mode', () => {
	it('produces fossil + renewables + au-total series with the expected shape', () => {
		const fueltechStats = [
			makeFueltech('coal_black', constArr(100)),
			makeFueltech('gas_ccgt', constArr(50)),
			makeFueltech('wind', constArr(30)),
			makeFueltech('solar_utility', constArr(20)),
			makeFueltech('exports', constArr(10))
		];

		const out = calculateRenewables({ fueltechStats, marketStats: [] }, 'current');

		expect(out.statsDatasets.map((d) => d.id)).toEqual([FOSSIL_ID, RENEWABLES_ID, TOTAL_ID]);
		expect(out.seriesNames).toEqual([FOSSIL_ID, RENEWABLES_ID]);

		// Rolling sum drops the first 12 months
		// rolling-sum-12-mth strips months whose 12-mth window isn't strictly after
		// the first available date, which empirically drops 13 rows for an N-month input.
		expect(out.dataset.length).toBe(N - 13);

		// Each row sums to (fossil/total + renewables/total)*100 within rounding.
		// generation = 100+50+30+20 = 200; loads excluded → total = 200.
		// fossil = 150/200 = 75%, renewables = 50/200 = 25%
		const last = out.dataset[out.dataset.length - 1];
		expect(last[FOSSIL_ID]).toBeCloseTo(75, 5);
		expect(last[RENEWABLES_ID]).toBeCloseTo(25, 5);
	});

	it('handles fueltech series with offset start dates by aligning before grouping', () => {
		// solar_utility starts 6 months after the others.
		const fueltechStats = [
			makeFueltech('coal_black', constArr(100)),
			makeFueltech('wind', constArr(30)),
			makeFueltech('solar_utility', constArr(20).slice(0, N - 6))
		];

		const out = calculateRenewables({ fueltechStats, marketStats: [] }, 'current');
		// Should not crash and should produce a non-empty dataset.
		expect(out.dataset.length).toBeGreaterThan(0);
	});
});

describe('calculateRenewables — current_gross_demand mode', () => {
	it('uses local fueltech grouping but demand_gross_energy as denominator', () => {
		// generation = 100 (coal) + 50 (gas) + 30 (wind) + 20 (solar) = 200 GWh per month.
		// demand_gross = 250 GWh per month (more than generation, e.g. with rooftop offset).
		const fueltechStats = [
			makeFueltech('coal_black', constArr(100)),
			makeFueltech('gas_ccgt', constArr(50)),
			makeFueltech('wind', constArr(30)),
			makeFueltech('solar_utility', constArr(20))
		];
		const marketStats = [makeMarket('demand_gross_energy', constArr(250))];

		const out = calculateRenewables(
			{ fueltechStats, marketStats },
			'current_gross_demand',
			undefined,
			'monthly'
		);

		const last = out.dataset[out.dataset.length - 1];
		// renewables = 50 / 250 = 20%
		expect(last[RENEWABLES_ID]).toBeCloseTo(20, 5);
		// fossil = 150 / 250 = 60%
		expect(last[FOSSIL_ID]).toBeCloseTo(60, 5);
	});

	it('returns empty when demand_gross_energy is missing', () => {
		const fueltechStats = [makeFueltech('coal_black', constArr(100))];
		const out = calculateRenewables(
			{ fueltechStats, marketStats: [] },
			'current_gross_demand'
		);
		expect(out.dataset).toEqual([]);
	});
});

describe('calculateRenewables — oe_proportion mode', () => {
	it('renewables % matches generation_renewable_energy / demand_gross_energy', () => {
		const renewable = constArr(40);
		const demand = constArr(100);
		const marketStats = [
			makeMarket('generation_renewable_energy', renewable),
			makeMarket('demand_gross_energy', demand)
		];

		const out = calculateRenewables({ fueltechStats: [], marketStats }, 'oe_proportion');
		// rolling-sum-12-mth strips months whose 12-mth window isn't strictly after
		// the first available date, which empirically drops 13 rows for an N-month input.
		expect(out.dataset.length).toBe(N - 13);

		const last = out.dataset[out.dataset.length - 1];
		// renewables / demand = 40 / 100 = 40%
		expect(last[RENEWABLES_ID]).toBeCloseTo(40, 5);
		// fossil = (100-40) / 100 = 60%
		expect(last[FOSSIL_ID]).toBeCloseTo(60, 5);
	});

	it('handles renewable series that starts later than demand (alignment)', () => {
		const renewableShort = constArr(40).slice(0, N - 6);
		const demand = constArr(100);
		const marketStats = [
			makeMarket('generation_renewable_energy', renewableShort),
			makeMarket('demand_gross_energy', demand)
		];

		const out = calculateRenewables({ fueltechStats: [], marketStats }, 'oe_proportion');
		// Should not throw; the 6 missing months at the front become null and
		// the rolling-sum filter takes care of the leading gap.
		expect(out.dataset.length).toBeGreaterThan(0);
	});
});

describe('calculateRenewables — oe_with_storage mode', () => {
	it('adds battery_discharging to the renewable numerator', () => {
		const renewable = constArr(40);
		const demand = constArr(100);
		const battery = constArr(5);

		const marketStats = [
			makeMarket('generation_renewable_energy', renewable),
			makeMarket('demand_gross_energy', demand)
		];
		const fueltechStats = [makeFueltech('battery_discharging', battery)];

		const out = calculateRenewables({ fueltechStats, marketStats }, 'oe_with_storage');
		// rolling-sum-12-mth strips months whose 12-mth window isn't strictly after
		// the first available date, which empirically drops 13 rows for an N-month input.
		expect(out.dataset.length).toBe(N - 13);

		const last = out.dataset[out.dataset.length - 1];
		// renewables_with_storage / demand = 45 / 100 = 45%
		expect(last[RENEWABLES_ID]).toBeCloseTo(45, 5);
		// fossil = (100 - 45) / 100 = 55%
		expect(last[FOSSIL_ID]).toBeCloseTo(55, 5);
	});

	it('falls back to plain renewable when battery_discharging series is absent', () => {
		const renewable = constArr(40);
		const demand = constArr(100);
		const marketStats = [
			makeMarket('generation_renewable_energy', renewable),
			makeMarket('demand_gross_energy', demand)
		];

		const out = calculateRenewables({ fueltechStats: [], marketStats }, 'oe_with_storage');
		const last = out.dataset[out.dataset.length - 1];
		expect(last[RENEWABLES_ID]).toBeCloseTo(40, 5);
		expect(last[FOSSIL_ID]).toBeCloseTo(60, 5);
	});
});

describe('calculateRenewables — smoothing', () => {
	it('defaults to rolling12mth (drops leading rows, smoothed values)', () => {
		const renewable = constArr(40);
		const demand = constArr(100);
		const marketStats = [
			makeMarket('generation_renewable_energy', renewable),
			makeMarket('demand_gross_energy', demand)
		];

		const out = calculateRenewables({ fueltechStats: [], marketStats }, 'oe_proportion');
		expect(out.dataset.length).toBe(N - 13);
	});

	it('monthly smoothing keeps every month and computes per-month %', () => {
		const renewable = constArr(40);
		const demand = constArr(100);
		const marketStats = [
			makeMarket('generation_renewable_energy', renewable),
			makeMarket('demand_gross_energy', demand)
		];

		const out = calculateRenewables(
			{ fueltechStats: [], marketStats },
			'oe_proportion',
			undefined,
			'monthly'
		);
		expect(out.dataset.length).toBe(N);

		// Each row is 40/100 = 40% (monthly, no smoothing window)
		for (const row of out.dataset) {
			expect(row[RENEWABLES_ID]).toBeCloseTo(40, 5);
			expect(row[FOSSIL_ID]).toBeCloseTo(60, 5);
		}
	});
});

describe('calculateRenewables — oe_secondary_renewable mode', () => {
	it('uses generation_renewable_aggregate / demand_gross_energy', () => {
		// Construct the synthetic StatsData records that transformOeToStatsData
		// produces from a secondary_grouping=renewable response.
		/** @type {StatsData} */
		const renewableAggregate = /** @type {any} */ (
			makeMarket('generation_renewable_aggregate', constArr(7000))
		);
		renewableAggregate.fuel_tech = /** @type {FuelTechCode} */ ('renewable_aggregate');

		/** @type {StatsData} */
		const nonRenewableAggregate = /** @type {any} */ (
			makeMarket('generation_non_renewable_aggregate', constArr(11000))
		);
		nonRenewableAggregate.fuel_tech = /** @type {FuelTechCode} */ ('non_renewable_aggregate');

		const demand = makeMarket('demand_gross_energy', constArr(20000));

		const out = calculateRenewables(
			{
				fueltechStats: [],
				marketStats: [renewableAggregate, nonRenewableAggregate, demand]
			},
			'oe_secondary_renewable',
			undefined,
			'monthly'
		);

		const last = out.dataset[out.dataset.length - 1];
		// renewables = 7000 / 20000 = 35%
		expect(last[RENEWABLES_ID]).toBeCloseTo(35, 5);
		// fossil from non-renewable aggregate = 11000 / 20000 = 55%
		expect(last[FOSSIL_ID]).toBeCloseTo(55, 5);
	});

	it('falls back to demand − renewable when non_renewable aggregate is absent', () => {
		/** @type {StatsData} */
		const renewableAggregate = /** @type {any} */ (
			makeMarket('generation_renewable_aggregate', constArr(40))
		);
		renewableAggregate.fuel_tech = /** @type {FuelTechCode} */ ('renewable_aggregate');

		const demand = makeMarket('demand_gross_energy', constArr(100));

		const out = calculateRenewables(
			{ fueltechStats: [], marketStats: [renewableAggregate, demand] },
			'oe_secondary_renewable',
			undefined,
			'monthly'
		);

		const last = out.dataset[out.dataset.length - 1];
		expect(last[RENEWABLES_ID]).toBeCloseTo(40, 5);
		// fossil derived as 100 − 40 = 60 → 60%
		expect(last[FOSSIL_ID]).toBeCloseTo(60, 5);
	});

	it('returns empty when generation_renewable_aggregate is missing', () => {
		const demand = makeMarket('demand_gross_energy', constArr(100));
		const out = calculateRenewables(
			{ fueltechStats: [], marketStats: [demand] },
			'oe_secondary_renewable'
		);
		expect(out.dataset).toEqual([]);
	});
});

describe('calculateRenewables — value type', () => {
	it('returns raw values (no percentage conversion) when valueType is "raw"', () => {
		const renewable = constArr(40);
		const demand = constArr(100);
		const marketStats = [
			makeMarket('generation_renewable_energy', renewable),
			makeMarket('demand_gross_energy', demand)
		];

		const out = calculateRenewables(
			{ fueltechStats: [], marketStats },
			'oe_proportion',
			undefined,
			'monthly',
			'raw'
		);

		// Each row has the raw GWh values, not percentages
		const last = out.dataset[out.dataset.length - 1];
		expect(last[RENEWABLES_ID]).toBeCloseTo(40, 5);
		expect(last[FOSSIL_ID]).toBeCloseTo(60, 5);
		expect(last[TOTAL_ID]).toBeCloseTo(100, 5);

		// Total series is included in seriesNames for raw mode (so it can be plotted)
		expect(out.seriesNames).toContain(TOTAL_ID);
	});

	it('raw + rolling12mth returns 12-month sums in GWh', () => {
		const renewable = constArr(40);
		const demand = constArr(100);
		const marketStats = [
			makeMarket('generation_renewable_energy', renewable),
			makeMarket('demand_gross_energy', demand)
		];

		const out = calculateRenewables(
			{ fueltechStats: [], marketStats },
			'oe_proportion',
			undefined,
			'rolling12mth',
			'raw'
		);

		// 12 months × 40 = 480 GWh rolling sum for renewables
		const last = out.dataset[out.dataset.length - 1];
		expect(last[RENEWABLES_ID]).toBeCloseTo(40 * 12, 5);
		expect(last[TOTAL_ID]).toBeCloseTo(100 * 12, 5);
	});
});

describe('calculateRenewables — cross-mode comparison', () => {
	it('oe_with_storage renewables % > oe_proportion renewables % when battery > 0', () => {
		const renewable = constArr(40);
		const demand = constArr(100);
		const battery = constArr(5);

		const marketStats = [
			makeMarket('generation_renewable_energy', renewable),
			makeMarket('demand_gross_energy', demand)
		];
		const fueltechStats = [makeFueltech('battery_discharging', battery)];

		const proportion = calculateRenewables({ fueltechStats, marketStats }, 'oe_proportion');
		const withStorage = calculateRenewables({ fueltechStats, marketStats }, 'oe_with_storage');

		const propLast = proportion.dataset[proportion.dataset.length - 1];
		const stoLast = withStorage.dataset[withStorage.dataset.length - 1];

		expect(stoLast[RENEWABLES_ID]).toBeGreaterThan(/** @type {number} */ (propLast[RENEWABLES_ID]));
	});
});
