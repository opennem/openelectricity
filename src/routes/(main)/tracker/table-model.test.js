// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { DEMAND_GROSS_SERIES_ID } from '$lib/components/charts/network/network-market-data.svelte.js';
import {
	buildFuelTechTableRows,
	computeAvPowerMW,
	computeContribution,
	computeCurtailmentRows,
	computeEmissions,
	computeOverlaySummary,
	computeVWPrices
} from './table-model.js';
import { getIntervalHours } from '$lib/components/charts/facility/interval-hours.js';

const MIN_30 = 30 * 60 * 1000;
const MIN_5 = 5 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const HALF_HOUR = () => 0.5;
const DAILY = () => 24;

/** Build uniform-interval rows from per-series value arrays. */
function makeRows(stepMs, series) {
	const length = Math.max(...Object.values(series).map((values) => values.length));
	return Array.from({ length }, (_, i) => {
		const row = { time: i * stepMs };
		for (const [key, values] of Object.entries(series)) {
			if (values[i] !== undefined) row[key] = values[i];
		}
		return row;
	});
}

// A 2-hour window: every feed at 30m, the one grain the page passes. Market
// value and emissions are per-bucket totals; ratios pair them with
// generation by period.
const seriesNames = ['coal', 'solar_rooftop', 'imports', 'battery_charging'];
const loadSeriesIds = ['battery_charging'];

// Energy: coal 600×0.5=300 MWh, rooftop 100, imports 20, battery −20.
const generationRows = makeRows(MIN_30, {
	coal: [100, 100, 200, 200],
	solar_rooftop: [50, 50, 50, 50],
	imports: [20, 20, 0, 0],
	battery_charging: [-10, -10, -10, -10]
});

// Σmv: coal $600, imports $24, battery −$48; rooftop never settles.
const mvRows = makeRows(MIN_30, {
	coal: Array(4).fill(150),
	imports: Array(4).fill(6),
	battery_charging: Array(4).fill(-12)
});

// 200 MW × 2h = 400 MWh gross demand.
const demandRows = makeRows(MIN_30, {
	[DEMAND_GROSS_SERIES_ID]: Array(4).fill(200)
});

// Per-bucket tonnes: coal 4 × 75 = 300 t, rooftop 0 t; imports and battery
// carry no emissions series.
const emissionsRows = makeRows(MIN_30, {
	coal: Array(4).fill(75),
	solar_rooftop: Array(4).fill(0)
});

describe('computeAvPowerMW', () => {
	it('means power rows, keeping load sign', () => {
		expect(computeAvPowerMW(generationRows, seriesNames, 'power', HALF_HOUR)).toEqual({
			coal: 150,
			solar_rooftop: 50,
			imports: 10,
			battery_charging: -10
		});
	});

	it('converts energy rows back through the bucket length', () => {
		const rows = makeRows(DAY, { coal: [2400, 4800] });
		expect(computeAvPowerMW(rows, ['coal'], 'energy', DAILY)).toEqual({ coal: 150 });
	});

	it('returns null for an empty window', () => {
		expect(computeAvPowerMW([], ['coal'], 'power', HALF_HOUR)).toEqual({ coal: null });
	});
});

describe('computeVWPrices', () => {
	it('ratios window sums, not means of ratios', () => {
		const prices = computeVWPrices({
			mvRows,
			generationRows,
			seriesNames,
			basis: 'power',
			bucketHours: HALF_HOUR
		});
		expect(prices.vwPrice.coal).toBeCloseTo(2); // $600 ÷ 300 MWh
		expect(prices.vwPrice.imports).toBeCloseTo(1.2); // $24 ÷ 20 MWh
	});

	it('yields a positive price for loads (negative ÷ negative)', () => {
		const prices = computeVWPrices({
			mvRows,
			generationRows,
			seriesNames,
			basis: 'power',
			bucketHours: HALF_HOUR
		});
		expect(prices.vwPrice.battery_charging).toBeCloseTo(2.4); // −$48 ÷ −20 MWh
	});

	it('distinguishes unsettled series from $0 settlements', () => {
		const prices = computeVWPrices({
			mvRows,
			generationRows,
			seriesNames,
			basis: 'power',
			bucketHours: HALF_HOUR
		});
		expect(prices.vwPrice.solar_rooftop).toBeNull();
	});

	it('refuses a near-zero energy denominator', () => {
		const rows = makeRows(MIN_30, { idle: [0, 0, 0, 0] });
		const mv = makeRows(MIN_30, { idle: Array(4).fill(30) });
		expect(
			computeVWPrices({
				mvRows: mv,
				generationRows: rows,
				seriesNames: ['idle'],
				basis: 'power',
				bucketHours: HALF_HOUR
			}).vwPrice
		).toEqual({ idle: null });
	});

	it('works at energy basis without interval conversion', () => {
		const rows = makeRows(DAY, { coal: [2400, 4800] });
		const mv = makeRows(DAY, { coal: [7200, 14400] });
		const prices = computeVWPrices({
			mvRows: mv,
			generationRows: rows,
			seriesNames: ['coal'],
			basis: 'energy',
			bucketHours: DAILY
		});
		expect(prices.vwPrice.coal).toBeCloseTo(3); // $21,600 ÷ 7,200 MWh
	});
});

describe('computeContribution', () => {
	it('leaves missing numerators and non-finite demand unavailable', () => {
		const input = {
			generationRows: [{ coal: 10, wind: null }],
			seriesNames: ['coal', 'wind'],
			basis: 'energy',
			demandBasis: 'energy',
			bucketHours: DAILY,
			loadSeriesIds: [],
			mode: 'demand'
		};
		expect(
			computeContribution({ ...input, demandRows: [{ [DEMAND_GROSS_SERIES_ID]: 20 }] })
		).toEqual({ coal: 50, wind: null });
		expect(
			computeContribution({ ...input, demandRows: [{ [DEMAND_GROSS_SERIES_ID]: Infinity }] })
		).toEqual({ coal: null, wind: null });
	});

	const input = {
		generationRows,
		seriesNames,
		basis: /** @type {const} */ ('power'),
		demandRows,
		demandBasis: /** @type {const} */ ('power'),
		bucketHours: HALF_HOUR,
		loadSeriesIds
	};

	it('shares source generation, excluding loads and imports from the base', () => {
		const pct = computeContribution({ ...input, mode: 'generation' });
		expect(pct.coal).toBeCloseTo(75); // 300 ÷ 400 MWh sources
		expect(pct.solar_rooftop).toBeCloseTo(25);
		expect(pct.imports).toBeNull();
		expect(pct.battery_charging).toBeNull();
	});

	it('shares gross demand, counting imports but not loads', () => {
		const pct = computeContribution({ ...input, mode: 'demand' });
		expect(pct.coal).toBeCloseTo(75); // 300 ÷ 400 MWh demand
		expect(pct.solar_rooftop).toBeCloseTo(25);
		expect(pct.imports).toBeCloseTo(5);
		expect(pct.battery_charging).toBeNull();
	});

	it('returns null when the demand window is empty', () => {
		const pct = computeContribution({ ...input, demandRows: [], mode: 'demand' });
		expect(pct.coal).toBeNull();
	});

	it('returns null across the board for an empty generation window', () => {
		const pct = computeContribution({ ...input, generationRows: [], mode: 'generation' });
		expect(pct).toEqual({ coal: null, solar_rooftop: null, imports: null, battery_charging: null });
	});
});

describe('computeEmissions', () => {
	const input = {
		emissionsRows,
		generationRows,
		seriesNames,
		basis: /** @type {const} */ ('power'),
		bucketHours: HALF_HOUR,
		loadSeriesIds
	};

	it("sums window tonnes and ratios them against each series' own energy", () => {
		const { volumeT, intensityKgPerMWh } = computeEmissions(input);
		expect(volumeT.coal).toBeCloseTo(300);
		expect(intensityKgPerMWh.coal).toBeCloseTo(1000); // 300 t ÷ 300 MWh × 1000
		expect(volumeT.solar_rooftop).toBe(0);
		expect(intensityKgPerMWh.solar_rooftop).toBe(0);
	});

	it('nulls series without an emissions feed and every load', () => {
		const { volumeT, intensityKgPerMWh } = computeEmissions(input);
		expect(volumeT.imports).toBeNull();
		expect(intensityKgPerMWh.imports).toBeNull();
		expect(volumeT.battery_charging).toBeNull();
		expect(intensityKgPerMWh.battery_charging).toBeNull();
	});

	it('keeps the volume but nulls the intensity when the energy is ~zero', () => {
		const idle = makeRows(MIN_30, { idle: [0, 0, 0, 0] });
		const tonnes = makeRows(MIN_30, { idle: Array(4).fill(6) });
		const { volumeT, intensityKgPerMWh } = computeEmissions({
			emissionsRows: tonnes,
			generationRows: idle,
			seriesNames: ['idle'],
			basis: 'power',
			bucketHours: HALF_HOUR,
			loadSeriesIds: []
		});
		expect(volumeT.idle).toBeCloseTo(24);
		expect(intensityKgPerMWh.idle).toBeNull();
	});
});

describe('buildFuelTechTableRows', () => {
	const input = {
		generationData: {
			data: generationRows,
			seriesNames,
			seriesLabels: { coal: 'Coal (Black)', battery_charging: 'Battery (Charging)' },
			seriesColours: { coal: '#131313' }
		},
		mvRows,
		emissionsRows,
		demandRows,
		basis: /** @type {const} */ ('power'),
		demandBasis: /** @type {const} */ ('power'),
		bucketHours: HALF_HOUR,
		mode: /** @type {const} */ ('generation'),
		hiddenSeries: ['solar_rooftop'],
		loadSeriesIds
	};

	it('assembles rows in reversed stack order with magnitudes and flags', () => {
		const rows = buildFuelTechTableRows(input);
		expect(rows.map((row) => row.id)).toEqual([
			'battery_charging',
			'imports',
			'solar_rooftop',
			'coal'
		]);
		const battery = rows[0];
		expect(battery).toMatchObject({
			label: 'Battery (Charging)',
			isLoad: true,
			hidden: false,
			energyMWh: 20, // magnitude of −20
			avPowerMW: 10, // magnitude of −10
			contributionPct: null,
			vwPrice: expect.closeTo(2.4)
		});
		expect(rows.find((row) => row.id === 'coal')).toMatchObject({
			colour: '#131313',
			isLoad: false,
			energyMWh: 300,
			avPowerMW: 150,
			contributionPct: expect.closeTo(75),
			vwPrice: expect.closeTo(2),
			emissionsT: expect.closeTo(300),
			intensityKgPerMWh: expect.closeTo(1000)
		});
		expect(battery).toMatchObject({ emissionsT: null, intensityKgPerMWh: null });
	});

	it('files a net-negative mixed group under loads by sign', () => {
		const rows = buildFuelTechTableRows({
			...input,
			generationData: {
				data: makeRows(MIN_30, { battery: [-5, -5, -5, -5] }),
				seriesNames: ['battery'],
				seriesLabels: {},
				seriesColours: {}
			},
			loadSeriesIds: []
		});
		expect(rows[0].isLoad).toBe(true);
	});

	it('attaches the present member fuel techs to each row, defaulting empty', () => {
		const rows = buildFuelTechTableRows({
			...input,
			generationData: {
				...input.generationData,
				groupFuelTechs: { coal: ['coal_black', 'coal_brown'] }
			}
		});
		expect(rows.find((row) => row.id === 'coal')?.fuelTechs).toEqual(['coal_black', 'coal_brown']);
		expect(rows.find((row) => row.id === 'imports')?.fuelTechs).toEqual([]);
	});

	it('keeps percentages stable when rows are hidden', () => {
		const visible = buildFuelTechTableRows({ ...input, hiddenSeries: [] });
		const hidden = buildFuelTechTableRows({ ...input, hiddenSeries: ['coal', 'imports'] });
		expect(hidden.map((row) => row.contributionPct)).toEqual(
			visible.map((row) => row.contributionPct)
		);
		expect(hidden.find((row) => row.id === 'coal')?.hidden).toBe(true);
	});
});

describe('computeCurtailmentRows', () => {
	it('values curtailment like source rows against the shared denominator', () => {
		// 4 × 30m buckets: solar 20 MW × 2h = 40 MWh, wind absent → dropped.
		const rows = makeRows(MIN_30, { curtailment_solar: [20, 20, 20, 20] });
		const out = computeCurtailmentRows({
			rows,
			series: [
				{ id: 'curtailment_solar', label: 'Solar' },
				{ id: 'curtailment_wind', label: 'Wind' }
			],
			basis: 'power',
			bucketHours: HALF_HOUR,
			denominatorMWh: 400
		});
		expect(out).toHaveLength(1);
		expect(out[0]).toMatchObject({
			id: 'curtailment_solar',
			label: 'Solar',
			energyMWh: 40,
			avPowerMW: 20
		});
		expect(out[0].contributionPct).toBeCloseTo(10); // 40 ÷ 400 MWh
	});

	it('nulls the share when the denominator is empty', () => {
		const rows = makeRows(MIN_30, { curtailment_wind: [4, 4, 4, 4] });
		const out = computeCurtailmentRows({
			rows,
			series: [{ id: 'curtailment_wind', label: 'Wind' }],
			basis: 'power',
			bucketHours: HALF_HOUR,
			denominatorMWh: 0
		});
		expect(out[0].contributionPct).toBeNull();
	});
});

describe('computeOverlaySummary', () => {
	it('averages demand, official renewables and the official share', () => {
		const summary = computeOverlaySummary({
			demandRows: makeRows(MIN_5, { demand: Array(24).fill(180) }),
			marketRows: makeRows(MIN_5, { renewables: Array(24).fill(90) }),
			shareRows: makeRows(MIN_5, { renewable_share: Array(24).fill(38.8) }),
			basis: 'power',
			bucketHours: () => 5 / 60
		});
		expect(summary.demandEnergyMWh).toBeCloseTo(360); // 180 MW × 2h
		expect(summary.demandAvMW).toBeCloseTo(180);
		expect(summary.renewablesEnergyMWh).toBeCloseTo(180);
		expect(summary.renewablesAvMW).toBeCloseTo(90);
		expect(summary.renewablesSharePct).toBeCloseTo(38.8);
	});

	it('returns nulls for empty windows', () => {
		const summary = computeOverlaySummary({
			demandRows: [],
			marketRows: [],
			shareRows: [],
			basis: 'power',
			bucketHours: HALF_HOUR
		});
		expect(summary).toEqual({
			demandEnergyMWh: null,
			demandAvMW: null,
			renewablesEnergyMWh: null,
			renewablesAvMW: null,
			renewablesSharePct: null
		});
	});
});

describe('single displayed interval', () => {
	it.each([
		['power', 0.5, 100, 50],
		['energy', 29 * 24, 696, 696],
		['energy', 365.25 * 24, 8766, 8766]
	])('preserves ratios and duration for %s buckets', (basis, hours, value, energy) => {
		const rows = buildFuelTechTableRows({
			generationData: {
				data: [{ time: 0, coal: value, pumps: -value / 10 }],
				seriesNames: ['coal', 'pumps'],
				seriesLabels: {},
				seriesColours: {}
			},
			mvRows: [{ time: 0, coal: energy * 30, pumps: -energy * 3 }],
			emissionsRows: [{ time: 0, coal: energy * 0.9 }],
			demandRows: [{ time: 0, [DEMAND_GROSS_SERIES_ID]: value * 2 }],
			basis,
			demandBasis: basis,
			bucketHours: () => hours,
			mode: 'demand',
			hiddenSeries: [],
			loadSeriesIds: ['pumps']
		});
		expect(rows[1]).toMatchObject({
			energyMWh: energy,
			avPowerMW: energy / hours,
			vwPrice: 30,
			contributionPct: 50,
			emissionsT: energy * 0.9,
			intensityKgPerMWh: 900
		});
		expect(rows[0].vwPrice).toBeCloseTo(30);
		expect(rows[0]).toMatchObject({
			isLoad: true,
			contributionPct: null,
			emissionsT: null
		});
	});
});

describe('calendar buckets', () => {
	// A constant 100 MW: 74,400 MWh in a 31-day month, 67,200 MWh in February.
	const month = (iso) => Date.parse(iso);
	const monthHours = (time) => getIntervalHours('1M', time, 'Australia/Brisbane');
	/** @param {Array<{time: number, coal: number}>} data */
	const coalRow = (data) =>
		buildFuelTechTableRows({
			generationData: { data, seriesNames: ['coal'], seriesLabels: {}, seriesColours: {} },
			mvRows: [],
			emissionsRows: [],
			demandRows: [],
			basis: 'energy',
			demandBasis: 'energy',
			bucketHours: monthHours,
			mode: 'generation',
			hiddenSeries: [],
			loadSeriesIds: []
		})[0];

	it('divides by each month’s own length, not the first gap', () => {
		const row = coalRow([
			{ time: month('2024-12-31T14:00:00Z'), coal: 74_400 },
			{ time: month('2025-01-31T14:00:00Z'), coal: 67_200 }
		]);
		expect(row.avPowerMW).toBeCloseTo(100);
		expect(row.energyMWh).toBe(141_600);
	});

	it('never reads a filter’s skipped months as bucket length', () => {
		// January only, across 2024 and 2025: the rows sit a year apart.
		const row = coalRow([
			{ time: month('2023-12-31T14:00:00Z'), coal: 74_400 },
			{ time: month('2024-12-31T14:00:00Z'), coal: 74_400 }
		]);
		expect(row.avPowerMW).toBeCloseTo(100);
	});

	it('averages a single month', () => {
		expect(coalRow([{ time: month('2024-01-31T14:00:00Z'), coal: 69_600 }]).avPowerMW).toBeCloseTo(
			100
		); // February 2024: 29 days
	});

	it('weighs power buckets by their hours when summing energy', () => {
		// Two non-contiguous 30m buckets (a filter removed the rows between).
		const rows = buildFuelTechTableRows({
			generationData: {
				data: [
					{ time: 0, coal: 100 },
					{ time: DAY, coal: 300 }
				],
				seriesNames: ['coal'],
				seriesLabels: {},
				seriesColours: {}
			},
			mvRows: [],
			emissionsRows: [],
			demandRows: [],
			basis: 'power',
			demandBasis: 'power',
			bucketHours: HALF_HOUR,
			mode: 'generation',
			hiddenSeries: [],
			loadSeriesIds: []
		});
		expect(rows[0]).toMatchObject({ energyMWh: 200, avPowerMW: 200 });
	});
});

describe('partial numerator coverage', () => {
	// Two 100 MWh periods; the second has generation but no numerator.
	const generation = makeRows(DAY, { coal: [100, 100] });
	const input = {
		generationRows: generation,
		seriesNames: ['coal'],
		basis: /** @type {const} */ ('energy'),
		bucketHours: DAILY
	};

	it('prices only the periods with market value', () => {
		const prices = computeVWPrices({ ...input, mvRows: [{ time: 0, coal: 10_000 }] });
		expect(prices.vwPrice.coal).toBe(100); // not $10,000 ÷ 200 MWh
		expect(prices.vwPricePartial.coal).toBe(true);
	});

	it('takes intensity over the periods with emissions, keeping the full volume', () => {
		const { volumeT, intensityKgPerMWh, intensityPartial } = computeEmissions({
			...input,
			emissionsRows: [{ time: 0, coal: 90 }, { time: DAY }],
			loadSeriesIds: []
		});
		expect(volumeT.coal).toBe(90);
		expect(intensityKgPerMWh.coal).toBe(900); // not 450
		expect(intensityPartial.coal).toBe(true);
	});

	it('counts zero and negative readings as real periods', () => {
		const prices = computeVWPrices({
			...input,
			mvRows: makeRows(DAY, { coal: [10_000, -2_000] })
		});
		expect(prices.vwPrice.coal).toBe(40); // $8,000 ÷ 200 MWh
		expect(prices.vwPricePartial.coal).toBe(false);
		const { intensityKgPerMWh, intensityPartial } = computeEmissions({
			...input,
			emissionsRows: makeRows(DAY, { coal: [90, 0] }),
			loadSeriesIds: []
		});
		expect(intensityKgPerMWh.coal).toBe(450);
		expect(intensityPartial.coal).toBe(false);
	});

	it('is complete when the uncovered periods generated nothing', () => {
		const prices = computeVWPrices({
			...input,
			generationRows: makeRows(DAY, { coal: [100, 0] }),
			mvRows: [{ time: 0, coal: 10_000 }]
		});
		expect(prices.vwPrice.coal).toBe(100);
		expect(prices.vwPricePartial.coal).toBe(false);
	});

	it('carries the flags onto the table rows', () => {
		const [row] = buildFuelTechTableRows({
			generationData: {
				data: generation,
				seriesNames: ['coal'],
				seriesLabels: {},
				seriesColours: {}
			},
			mvRows: [{ time: 0, coal: 10_000 }],
			emissionsRows: makeRows(DAY, { coal: [90, 90] }),
			demandRows: [],
			basis: 'energy',
			demandBasis: 'energy',
			bucketHours: DAILY,
			mode: 'generation',
			hiddenSeries: [],
			loadSeriesIds: []
		});
		expect(row).toMatchObject({
			vwPrice: 100,
			vwPricePartial: true,
			intensityKgPerMWh: 900,
			intensityPartial: false
		});
	});

	it('leaves out market value for periods without generation', () => {
		const prices = computeVWPrices({
			...input,
			generationRows: makeRows(DAY, { coal: [100, null] }),
			mvRows: makeRows(DAY, { coal: [10_000, 5_000] })
		});
		expect(prices.vwPrice.coal).toBe(100);
	});

	it('is unavailable when no period reports both', () => {
		const prices = computeVWPrices({ ...input, mvRows: [{ time: 2 * DAY, coal: 10_000 }] });
		expect(prices.vwPrice.coal).toBeNull();
		expect(prices.vwPricePartial.coal).toBe(false);
	});
});
