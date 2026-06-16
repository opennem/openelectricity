import { describe, it, expect } from 'vitest';
import {
	calculateRenewables,
	RENEWABLE_MODES,
	FOSSIL_ID,
	FOSSIL_FUELTECH_ID,
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
	it('exposes the three modes with legacy_opennem last as the reference baseline', () => {
		expect(RENEWABLE_MODES.map((m) => m.id)).toEqual([
			'oe_proportion',
			'oe_secondary_renewable',
			'legacy_opennem'
		]);
	});

	it('documents the fueltech fossil comparison line on both OE modes only', () => {
		const byId = Object.fromEntries(RENEWABLE_MODES.map((m) => [m.id, m]));
		expect(byId.oe_proportion.fossilFueltechNumerator).toBeTruthy();
		expect(byId.oe_secondary_renewable.fossilFueltechNumerator).toBeTruthy();
		expect(byId.legacy_opennem.fossilFueltechNumerator).toBeUndefined();
	});
});

describe('calculateRenewables — empty / invalid inputs', () => {
	it('returns empty result for null input', () => {
		// @ts-expect-error testing null input
		const out = calculateRenewables(null, 'legacy_opennem');
		expect(out.dataset).toEqual([]);
		expect(out.statsDatasets).toEqual([]);
	});

	it('returns empty result when legacyFueltechStats is empty in legacy_opennem mode', () => {
		const out = calculateRenewables({ marketStats: [], legacyFueltechStats: [] }, 'legacy_opennem');
		expect(out.dataset).toEqual([]);
	});

	it('returns empty result when market metrics are missing in oe_proportion mode', () => {
		const out = calculateRenewables({ marketStats: [] }, 'oe_proportion');
		expect(out.dataset).toEqual([]);
	});

	it('throws on unknown mode', () => {
		expect(() => calculateRenewables({ marketStats: [] }, /** @type {any} */ ('bogus'))).toThrow(
			/Unknown renewable mode/
		);
	});
});

describe('calculateRenewables — legacy_opennem mode', () => {
	it('groups local fueltechs and computes % using generation − loads as denominator', () => {
		const legacyFueltechStats = [
			makeFueltech('coal_black', constArr(100)),
			makeFueltech('gas_ccgt', constArr(50)),
			makeFueltech('wind', constArr(30)),
			makeFueltech('solar_utility', constArr(20)),
			makeFueltech('exports', constArr(10))
		];

		const out = calculateRenewables({ marketStats: [], legacyFueltechStats }, 'legacy_opennem');

		expect(out.statsDatasets.map((d) => d.id)).toEqual([FOSSIL_ID, RENEWABLES_ID, TOTAL_ID]);
		expect(out.seriesNames).toEqual([FOSSIL_ID, RENEWABLES_ID, TOTAL_ID]);

		// rolling-sum-12-mth strips months whose 12-mth window isn't strictly after
		// the first available date, which empirically drops 13 rows for an N-month input.
		expect(out.dataset.length).toBe(N - 13);

		// generation = 100+50+30+20 = 200; loads excluded → total = 200.
		// fossil = 150/200 = 75%, renewables = 50/200 = 25%
		const last = out.dataset[out.dataset.length - 1];
		expect(last[FOSSIL_ID]).toBeCloseTo(75, 5);
		expect(last[RENEWABLES_ID]).toBeCloseTo(25, 5);
	});

	it('handles fueltech series with offset start dates by aligning before grouping', () => {
		// solar_utility starts 6 months after the others.
		const legacyFueltechStats = [
			makeFueltech('coal_black', constArr(100)),
			makeFueltech('wind', constArr(30)),
			makeFueltech('solar_utility', constArr(20).slice(0, N - 6))
		];

		const out = calculateRenewables({ marketStats: [], legacyFueltechStats }, 'legacy_opennem');
		expect(out.dataset.length).toBeGreaterThan(0);
	});

	it('returns empty when legacyFueltechStats is missing', () => {
		const out = calculateRenewables({ marketStats: [] }, 'legacy_opennem');
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

		const out = calculateRenewables({ marketStats }, 'oe_proportion');
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

		const out = calculateRenewables({ marketStats }, 'oe_proportion');
		// Should not throw; the 6 missing months at the front become null and
		// the rolling-sum filter takes care of the leading gap.
		expect(out.dataset.length).toBeGreaterThan(0);
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

		const out = calculateRenewables({ marketStats }, 'oe_proportion');
		expect(out.dataset.length).toBe(N - 13);
	});

	it('monthly smoothing keeps every month and computes per-month %', () => {
		const renewable = constArr(40);
		const demand = constArr(100);
		const marketStats = [
			makeMarket('generation_renewable_energy', renewable),
			makeMarket('demand_gross_energy', demand)
		];

		const out = calculateRenewables({ marketStats }, 'oe_proportion', undefined, 'monthly');
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
			{ marketStats: [renewableAggregate, nonRenewableAggregate, demand] },
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
			{ marketStats: [renewableAggregate, demand] },
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
		const out = calculateRenewables({ marketStats: [demand] }, 'oe_secondary_renewable');
		expect(out.dataset).toEqual([]);
	});
});

describe('calculateRenewables — fossil fueltech comparison series', () => {
	it('sums fossil fueltechs into a black comparison line in oe_proportion mode', () => {
		const marketStats = [
			makeMarket('generation_renewable_energy', constArr(40)),
			makeMarket('demand_gross_energy', constArr(100)),
			makeFueltech('coal_black', constArr(30)),
			makeFueltech('gas_ccgt', constArr(25)),
			// Non-fossil fueltechs must be excluded from the sum.
			makeFueltech('battery_discharging', constArr(5)),
			makeFueltech('pumps', constArr(3))
		];

		const out = calculateRenewables({ marketStats }, 'oe_proportion', undefined, 'monthly');

		expect(out.statsDatasets.map((d) => d.id)).toEqual([
			FOSSIL_ID,
			FOSSIL_FUELTECH_ID,
			RENEWABLES_ID,
			TOTAL_ID
		]);
		expect(out.seriesNames).toContain(FOSSIL_FUELTECH_ID);
		expect(out.seriesColours[FOSSIL_FUELTECH_ID]).toBe('#A3906799');
		expect(out.seriesLabels[FOSSIL_FUELTECH_ID]).toBe('Fossils (Σ fueltech)');

		const last = out.dataset[out.dataset.length - 1];
		// fueltech fossil = (30 + 25) / 100 = 55% — battery & pumps excluded
		expect(last[FOSSIL_FUELTECH_ID]).toBeCloseTo(55, 5);
		// derived fossil unchanged: (100 − 40) / 100 = 60%
		expect(last[FOSSIL_ID]).toBeCloseTo(60, 5);
	});

	it('adds the same line in oe_secondary_renewable mode', () => {
		/** @type {StatsData} */
		const renewableAggregate = /** @type {any} */ (
			makeMarket('generation_renewable_aggregate', constArr(40))
		);
		renewableAggregate.fuel_tech = /** @type {FuelTechCode} */ ('renewable_aggregate');

		const marketStats = [
			renewableAggregate,
			makeMarket('demand_gross_energy', constArr(100)),
			makeFueltech('coal_brown', constArr(20)),
			makeFueltech('distillate', constArr(2))
		];

		const out = calculateRenewables(
			{ marketStats },
			'oe_secondary_renewable',
			undefined,
			'monthly'
		);

		expect(out.seriesNames).toContain(FOSSIL_FUELTECH_ID);
		const last = out.dataset[out.dataset.length - 1];
		expect(last[FOSSIL_FUELTECH_ID]).toBeCloseTo(22, 5);
	});

	it('omits the series when no fossil fueltech rows are present', () => {
		const marketStats = [
			makeMarket('generation_renewable_energy', constArr(40)),
			makeMarket('demand_gross_energy', constArr(100))
		];

		const out = calculateRenewables({ marketStats }, 'oe_proportion', undefined, 'monthly');
		expect(out.seriesNames).not.toContain(FOSSIL_FUELTECH_ID);
		expect(out.statsDatasets.map((d) => d.id)).toEqual([FOSSIL_ID, RENEWABLES_ID, TOTAL_ID]);
	});

	it('treats a single fueltech gap as 0 instead of nulling the sum', () => {
		// gas_recip ends 6 months early — alignment pads the back with nulls.
		const marketStats = [
			makeMarket('generation_renewable_energy', constArr(40)),
			makeMarket('demand_gross_energy', constArr(100)),
			makeFueltech('coal_black', constArr(30)),
			makeFueltech('gas_recip', constArr(10).slice(0, N - 6))
		];

		const out = calculateRenewables({ marketStats }, 'oe_proportion', undefined, 'monthly');

		// While both run: 30 + 10 = 40%.
		expect(out.dataset[0][FOSSIL_FUELTECH_ID]).toBeCloseTo(40, 5);
		// After gas_recip's series ends only coal_black contributes — the null
		// counts as 0 rather than nulling the whole sum (which would clip the
		// line via trimSharedNulls).
		const last = out.dataset[out.dataset.length - 1];
		expect(last[FOSSIL_FUELTECH_ID]).toBeCloseTo(30, 5);
	});
});

describe('calculateRenewables — gross demand (total) series', () => {
	const marketStats = () => [
		makeMarket('generation_renewable_energy', constArr(40)),
		makeMarket('demand_gross_energy', constArr(100))
	];

	it('plots the red gross demand line by default (flat 100% in percentage mode)', () => {
		const out = calculateRenewables(
			{ marketStats: marketStats() },
			'oe_proportion',
			undefined,
			'monthly'
		);

		expect(out.seriesNames).toContain(TOTAL_ID);
		expect(out.seriesColours[TOTAL_ID]).toBe('#E03131');
		expect(out.seriesLabels[TOTAL_ID]).toBe('Gross demand');
		// demand ÷ demand — a flat 100% reference line
		expect(out.dataset[0][TOTAL_ID]).toBeCloseTo(100, 5);
	});

	it('excludes the total from seriesNames when showTotal is false (both value types)', () => {
		for (const valueType of /** @type {const} */ (['percentage', 'raw'])) {
			const out = calculateRenewables(
				{ marketStats: marketStats() },
				'oe_proportion',
				undefined,
				'monthly',
				valueType,
				false
			);
			expect(out.seriesNames).not.toContain(TOTAL_ID);
			// The total stays in statsDatasets — it's still the % denominator.
			expect(out.statsDatasets.map((d) => d.id)).toContain(TOTAL_ID);
		}
	});

	it('keeps full-history series when demand starts later (partial coverage)', () => {
		// Demand only exists for the last 12 months; renewables spans all 24.
		const demandLate = [...new Array(N - 12).fill(null), ...new Array(12).fill(100)];
		const marketStats = [
			makeMarket('generation_renewable_energy', constArr(40)),
			makeMarket('demand_gross_energy', demandLate)
		];

		const rawOut = calculateRenewables(
			{ marketStats },
			'oe_proportion',
			undefined,
			'monthly',
			'raw'
		);
		// No leading clip — renewables plots from the very first month…
		expect(rawOut.dataset.length).toBe(N);
		expect(rawOut.dataset[0][RENEWABLES_ID]).toBeCloseTo(40, 5);
		// …while demand-dependent series are null until demand begins.
		expect(rawOut.dataset[0][TOTAL_ID]).toBeNull();
		expect(rawOut.dataset[0][FOSSIL_ID]).toBeNull();
		expect(rawOut.dataset[N - 1][FOSSIL_ID]).toBeCloseTo(60, 5);

		// In percentage mode there's no denominator before demand begins — null, not 0.
		const pctOut = calculateRenewables({ marketStats }, 'oe_proportion', undefined, 'monthly');
		expect(pctOut.dataset[0][RENEWABLES_ID]).toBeNull();
		expect(pctOut.dataset[N - 1][RENEWABLES_ID]).toBeCloseTo(40, 5);
	});

	it('labels the legacy denominator accurately with the same red', () => {
		const legacyFueltechStats = [
			makeFueltech('coal_black', constArr(100)),
			makeFueltech('wind', constArr(30))
		];
		const out = calculateRenewables(
			{ marketStats: [], legacyFueltechStats },
			'legacy_opennem',
			undefined,
			'monthly'
		);
		expect(out.seriesColours[TOTAL_ID]).toBe('#E03131');
		expect(out.seriesLabels[TOTAL_ID]).toBe('Generation − loads (denominator)');
	});
});

describe('calculateRenewables — oe_homepage mode', () => {
	it('fossil = Σ fossil fueltechs ÷ gross demand, renewable = generation_renewable ÷ gross demand', () => {
		const marketStats = [
			makeMarket('generation_renewable_energy', constArr(40)),
			makeMarket('demand_gross_energy', constArr(100)),
			makeFueltech('coal_black', constArr(30)),
			makeFueltech('gas_ccgt', constArr(25)),
			// Non-fossil fueltechs must be excluded from the fossil sum.
			makeFueltech('battery_discharging', constArr(5)),
			makeFueltech('pumps', constArr(3))
		];

		const out = calculateRenewables({ marketStats }, 'oe_homepage', undefined, 'monthly');

		// Exactly two grouped series + the (hidden) gross-demand denominator —
		// the fossil line IS the fueltech sum, so no separate FOSSIL_FUELTECH_ID.
		expect(out.statsDatasets.map((d) => d.id)).toEqual([FOSSIL_ID, RENEWABLES_ID, TOTAL_ID]);
		expect(out.statsDatasets.map((d) => d.id)).not.toContain(FOSSIL_FUELTECH_ID);

		const last = out.dataset[out.dataset.length - 1];
		// fossil = (30 + 25) / 100 = 55% — battery & pumps excluded
		expect(last[FOSSIL_ID]).toBeCloseTo(55, 5);
		// renewable = 40 / 100 = 40%
		expect(last[RENEWABLES_ID]).toBeCloseTo(40, 5);
	});

	it('hides the gross-demand denominator line on the homepage (showTotal false)', () => {
		const marketStats = [
			makeMarket('generation_renewable_energy', constArr(40)),
			makeMarket('demand_gross_energy', constArr(100)),
			makeFueltech('coal_black', constArr(55))
		];

		const out = calculateRenewables(
			{ marketStats },
			'oe_homepage',
			undefined,
			'rolling12mth',
			'percentage',
			false
		);

		expect(out.seriesNames).toEqual([FOSSIL_ID, RENEWABLES_ID]);
		expect(out.seriesNames).not.toContain(TOTAL_ID);
		// rolling-sum-12-mth drops 13 rows for an N-month input.
		expect(out.dataset.length).toBe(N - 13);
		const last = out.dataset[out.dataset.length - 1];
		expect(last[FOSSIL_ID]).toBeCloseTo(55, 5);
		expect(last[RENEWABLES_ID]).toBeCloseTo(40, 5);
	});

	it('returns empty when no fossil fueltech rows are present (fossil line is required)', () => {
		const marketStats = [
			makeMarket('generation_renewable_energy', constArr(40)),
			makeMarket('demand_gross_energy', constArr(100))
		];

		const out = calculateRenewables({ marketStats }, 'oe_homepage', undefined, 'monthly');
		expect(out.dataset).toEqual([]);
		expect(out.statsDatasets).toEqual([]);
	});

	it('returns empty when gross demand is missing', () => {
		const marketStats = [
			makeMarket('generation_renewable_energy', constArr(40)),
			makeFueltech('coal_black', constArr(55))
		];

		const out = calculateRenewables({ marketStats }, 'oe_homepage', undefined, 'monthly');
		expect(out.dataset).toEqual([]);
	});

	it('nulls the % before gross demand begins (partial coverage)', () => {
		// Demand only exists for the last 12 months; renewables + fossil span all 24.
		const demandLate = [...new Array(N - 12).fill(null), ...new Array(12).fill(100)];
		const marketStats = [
			makeMarket('generation_renewable_energy', constArr(40)),
			makeMarket('demand_gross_energy', demandLate),
			makeFueltech('coal_black', constArr(55))
		];

		const out = calculateRenewables({ marketStats }, 'oe_homepage', undefined, 'monthly');
		// No denominator before demand begins → null, not 0.
		expect(out.dataset[0][FOSSIL_ID]).toBeNull();
		expect(out.dataset[0][RENEWABLES_ID]).toBeNull();
		const last = out.dataset[out.dataset.length - 1];
		expect(last[FOSSIL_ID]).toBeCloseTo(55, 5);
		expect(last[RENEWABLES_ID]).toBeCloseTo(40, 5);
	});

	it('ignores the first (partial) month of gross-demand coverage', () => {
		// Demand is null for month 0, then covered from month 1 onward — month 1 is
		// the partial ramp-up month (May 2006) that should be dropped, so the % only
		// begins at month 2 (June 2006).
		const demand = [null, ...new Array(N - 1).fill(100)];
		const marketStats = [
			makeMarket('generation_renewable_energy', constArr(40)),
			makeMarket('demand_gross_energy', demand),
			makeFueltech('coal_black', constArr(55))
		];

		const out = calculateRenewables({ marketStats }, 'oe_homepage', undefined, 'monthly');
		// Month 0: no demand at all → null.
		expect(out.dataset[0][RENEWABLES_ID]).toBeNull();
		// Month 1: first covered month is ignored → still null.
		expect(out.dataset[1][FOSSIL_ID]).toBeNull();
		expect(out.dataset[1][RENEWABLES_ID]).toBeNull();
		// Month 2: first real data point.
		expect(out.dataset[2][FOSSIL_ID]).toBeCloseTo(55, 5);
		expect(out.dataset[2][RENEWABLES_ID]).toBeCloseTo(40, 5);
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

		const out = calculateRenewables({ marketStats }, 'oe_proportion', undefined, 'monthly', 'raw');

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
			{ marketStats },
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
