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

const MIN_30 = 30 * 60 * 1000;
const MIN_5 = 5 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;

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

// A 2-hour window. Generation display-aggregated to 30m (power basis);
// market value and demand at their native 5m grain — the cross-grain shape
// the real page produces.
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
const mvRows = makeRows(MIN_5, {
	coal: Array(24).fill(25),
	imports: Array(24).fill(1),
	battery_charging: Array(24).fill(-2)
});

// 200 MW × 2h = 400 MWh gross demand.
const demandRows = makeRows(MIN_5, {
	[DEMAND_GROSS_SERIES_ID]: Array(24).fill(200)
});

// Per-bucket tonnes at 5m: coal 24 × 12.5 = 300 t, rooftop 0 t; imports and
// battery carry no emissions series.
const emissionsRows = makeRows(MIN_5, {
	coal: Array(24).fill(12.5),
	solar_rooftop: Array(24).fill(0)
});

describe('computeAvPowerMW', () => {
	it('means power rows, keeping load sign', () => {
		expect(computeAvPowerMW(generationRows, seriesNames, 'power')).toEqual({
			coal: 150,
			solar_rooftop: 50,
			imports: 10,
			battery_charging: -10
		});
	});

	it('converts energy rows back through the bucket length', () => {
		const rows = makeRows(DAY, { coal: [2400, 4800] });
		expect(computeAvPowerMW(rows, ['coal'], 'energy')).toEqual({ coal: 150 });
	});

	it('returns null for an empty window', () => {
		expect(computeAvPowerMW([], ['coal'], 'power')).toEqual({ coal: null });
	});
});

describe('computeVWPrices', () => {
	it('ratios window sums across grains, not means of ratios', () => {
		const prices = computeVWPrices({ mvRows, generationRows, seriesNames, basis: 'power' });
		expect(prices.coal).toBeCloseTo(2); // $600 ÷ 300 MWh
		expect(prices.imports).toBeCloseTo(1.2); // $24 ÷ 20 MWh
	});

	it('yields a positive price for loads (negative ÷ negative)', () => {
		const prices = computeVWPrices({ mvRows, generationRows, seriesNames, basis: 'power' });
		expect(prices.battery_charging).toBeCloseTo(2.4); // −$48 ÷ −20 MWh
	});

	it('distinguishes unsettled series from $0 settlements', () => {
		const prices = computeVWPrices({ mvRows, generationRows, seriesNames, basis: 'power' });
		expect(prices.solar_rooftop).toBeNull();
	});

	it('refuses a near-zero energy denominator', () => {
		const rows = makeRows(MIN_30, { idle: [0, 0, 0, 0] });
		const mv = makeRows(MIN_5, { idle: Array(24).fill(5) });
		expect(
			computeVWPrices({ mvRows: mv, generationRows: rows, seriesNames: ['idle'], basis: 'power' })
		).toEqual({ idle: null });
	});

	it('works at energy basis without interval conversion', () => {
		const rows = makeRows(DAY, { coal: [2400, 4800] });
		const mv = makeRows(DAY, { coal: [7200, 14400] });
		const prices = computeVWPrices({
			mvRows: mv,
			generationRows: rows,
			seriesNames: ['coal'],
			basis: 'energy'
		});
		expect(prices.coal).toBeCloseTo(3); // $21,600 ÷ 7,200 MWh
	});
});

describe('computeContribution', () => {
	const input = {
		generationRows,
		seriesNames,
		basis: /** @type {const} */ ('power'),
		demandRows,
		demandBasis: /** @type {const} */ ('power'),
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

	it('normalises a coarser generation grain against finer demand rows', () => {
		// Same 2h of coal as 1h buckets — the MWh sum is unchanged, so shares hold.
		const coarse = makeRows(60 * 60 * 1000, { coal: [150, 150] });
		const pct = computeContribution({
			...input,
			generationRows: coarse,
			seriesNames: ['coal'],
			mode: 'demand'
		});
		expect(pct.coal).toBeCloseTo(75);
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
		const tonnes = makeRows(MIN_5, { idle: Array(24).fill(1) });
		const { volumeT, intensityKgPerMWh } = computeEmissions({
			emissionsRows: tonnes,
			generationRows: idle,
			seriesNames: ['idle'],
			basis: 'power',
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
			basis: 'power'
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
			basis: 'power'
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
