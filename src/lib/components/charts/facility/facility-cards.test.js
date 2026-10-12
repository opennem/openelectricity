import { describe, expect, it } from 'vitest';
import { compareRows } from '$lib/components/charts/card/compare/chart-compare.js';
import {
	facilityCardDataset,
	facilityCardState,
	facilityCardUnit,
	facilityCompareSource,
	facilityFileName,
	facilitySummaryRows
} from './facility-cards.js';

const a = Date.UTC(2026, 9, 9, 7, 30);
const b = a + 1_800_000;

/** @type {import('./facility-cards.js').FacilityCardView} */
const view = {
	basis: 'power',
	marketTab: 'price',
	emissionsTab: 'volume',
	hidden: [],
	loadIds: []
};

/** @param {Array<Record<string, any>>} data @param {string[]} names */
const snapshot = (data, names) => ({
	data,
	seriesNames: names,
	seriesLabels: Object.fromEntries(names.map((name) => [name, name.toUpperCase()])),
	seriesColours: {}
});

const context = {
	...view,
	held: {},
	formatTime: String,
	facilityCode: 'BAYSW',
	zone: '+10:00',
	interval: '30m'
};

describe('facility card downloads', () => {
	const units = snapshot(
		[
			{ time: a, power_BW01: 600, power_BW02: 500 },
			{ time: b, power_BW01: 650, power_BW02: 450 }
		],
		['power_BW01', 'power_BW02']
	);
	it('exports what each chart draws, in base units, without hidden units', () => {
		const dataset = facilityCardDataset('generation', units, { ...view, hidden: ['power_BW02'] });
		expect(dataset?.columns.map((column) => column.header)).toEqual(['date', 'POWER_BW01 (MW)']);
		expect(dataset?.title).toBe('Generation');
		expect(facilityCardUnit('generation', { ...view, basis: 'energy' })).toBe('MWh');
		expect(facilityCardUnit('market', view)).toBe('$/MWh');
		expect(facilityCardUnit('market', { ...view, marketTab: 'mv' })).toBe('$');
		expect(facilityCardUnit('emissions', { ...view, emissionsTab: 'intensity' })).toBe(
			'kgCO2e/MWh'
		);
	});
	it('keeps every line of a line chart, whatever the units panel hides', () => {
		const price = snapshot([{ time: a, price: 80 }], ['price']);
		const dataset = facilityCardDataset('market', price, { ...view, hidden: ['price'] });
		expect(dataset?.columns).toHaveLength(2);
	});
	it('reads loading until the chart reports, then ready or empty', () => {
		expect(facilityCardState('generation', null, view)).toBe('loading');
		expect(facilityCardState('generation', units, view)).toBe('ready');
		expect(facilityCardState('generation', snapshot([], ['power_BW01']), view)).toBe('empty');
	});
	it('names files as the page always has, the workbook without a chart id', () => {
		expect(facilityFileName('BAYSW', '3d', 'generation', 'csv')).toBe('baysw-generation-3d.csv');
		expect(facilityFileName('BAYSW', '3d', null, 'xlsx')).toBe('baysw-3d.xlsx');
	});
	it('summarises the facility, window, interval and zone', () => {
		const rows = facilitySummaryRows({
			facility: { name: 'Bayswater', code: 'BAYSW', network_id: 'NEM', network_region: 'NSW1' },
			rangeLabel: '9 – 12 Oct 2026',
			intervalLabel: '30 min',
			timeZone: '+10:00'
		});
		expect(rows.map(([label]) => label)).toEqual([
			'Facility',
			'Region',
			'Range',
			'Interval',
			'Timezone'
		]);
		expect(rows[0][1]).toBe('Bayswater (BAYSW)');
	});
});

describe('facility comparisons', () => {
	it('compares the generation stack by unit, loads read as consumption', () => {
		const stack = snapshot(
			[
				{ time: a, power_U1: 100, power_PUMP: -20 },
				{ time: b, power_U1: 80, power_PUMP: -40 }
			],
			['power_PUMP', 'power_U1']
		);
		const source = facilityCompareSource('generation', stack, {
			...context,
			loadIds: ['power_PUMP']
		});
		expect(source?.kind).toBe('composition');
		expect(source?.rowHeader).toBe('Unit');
		const rows = compareRows(source, { a, b });
		// Pumping −20 → −40 MW reads as 20 → 40: more consumption, a rise.
		expect(rows.map((row) => [row.id, row.delta, row.isLoad])).toEqual([
			['power_U1', -20, false],
			['power_PUMP', 20, true]
		]);
		expect(source?.context?.[0]).toEqual({ key: 'facility', header: 'Facility', value: 'BAYSW' });
	});
	it('compares one price line as tiles, and split direction lines as lines', () => {
		const one = snapshot(
			[
				{ time: a, price: 50 },
				{ time: b, price: 150 }
			],
			['price']
		);
		expect(facilityCompareSource('market', one, context)?.kind).toBe('single');
		const two = snapshot(
			[
				{ time: a, charge: 50, discharge: 120 },
				{ time: b, charge: 40, discharge: 140 }
			],
			['charge', 'discharge']
		);
		expect(facilityCompareSource('market', two, context)?.kind).toBe('lines');
	});
	it('scales emissions volume to tonnes, kilotonnes or megatonnes', () => {
		const volume = snapshot([{ time: a, emissions_U1: 20_000 }], ['emissions_U1']);
		expect(facilityCompareSource('emissions', volume, context)?.unit).toBe('ktCO₂e');
		expect(
			facilityCompareSource('emissions', volume, { ...context, emissionsTab: 'intensity' })?.kind
		).toBe('single');
	});
	it('is null until the chart reports', () => {
		expect(facilityCompareSource('curtailment', null, context)).toBeNull();
	});
});
