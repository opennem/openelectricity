import { describe, expect, it } from 'vitest';
import {
	datasetColumnPlaces,
	datasetToCsv,
	formatDatasetCell,
	seriesDataset,
	sheetName,
	uniqueSheetNames
} from './export-dataset.js';

describe('formatDatasetCell', () => {
	const time = /** @type {const} */ ({ key: 'date', header: 'Date', type: 'time' });
	const number = /** @type {const} */ ({ key: 'v', header: 'V', type: 'number' });
	const flag = /** @type {const} */ ({ key: 'b', header: 'B', type: 'boolean' });

	it('shows times in network wall time to the minute', () => {
		const ms = Date.UTC(2026, 9, 12, 3, 30);
		expect(formatDatasetCell(time, { time: ms }, '+10:00')).toBe('2026-10-12 13:30');
		expect(formatDatasetCell(time, { date: new Date(ms) }, '+08:00')).toBe('2026-10-12 11:30');
	});

	it('rounds numbers to their size and groups thousands', () => {
		expect(formatDatasetCell(number, { v: 18437.6 }, '+10:00')).toBe('18,438');
		expect(formatDatasetCell(number, { v: -107.414 }, '+10:00')).toBe('-107.4');
		expect(formatDatasetCell(number, { v: 0.125 }, '+10:00')).toBe('0.13');
		expect(formatDatasetCell(number, { v: null }, '+10:00')).toBe('');
	});

	it('lines a column up at the places its largest value needs', () => {
		const places = datasetColumnPlaces({
			key: 'k',
			title: 'T',
			columns: [time, number],
			rows: [{ v: -3.6 }, { v: 824.68 }, { v: null }]
		});
		expect(places).toEqual({ v: 1 });
		expect(formatDatasetCell(number, { v: -4.712 }, '+10:00', places.v)).toBe('-4.7');
		expect(formatDatasetCell(number, { v: 11 }, '+10:00', places.v)).toBe('11.0');
	});

	it('shows booleans as Yes/No and missing text as blank', () => {
		expect(formatDatasetCell(flag, { b: true }, '+10:00')).toBe('Yes');
		expect(formatDatasetCell(flag, { b: false }, '+10:00')).toBe('No');
		expect(formatDatasetCell({ key: 's', header: 'S', type: 'string' }, {}, '+10:00')).toBe('');
	});
});

describe('sheet names', () => {
	it('strips illegal characters and caps the length', () => {
		expect(sheetName('Fuel tech: table?')).toBe('Fuel tech table');
		expect(sheetName('x'.repeat(40))).toHaveLength(31);
		expect(sheetName('[]')).toBe('Sheet');
	});

	it('numbers repeats within the limit and keeps Summary free', () => {
		const long = 'Average over last 28 full days and more';
		expect(uniqueSheetNames(['Coal', 'coal', 'Summary', long, long])).toEqual([
			'Coal',
			'coal (2)',
			'Summary (2)',
			'Average over last 28 full days',
			'Average over last 28 full d (2)'
		]);
		expect(uniqueSheetNames([long, long]).every((name) => name.length <= 31)).toBe(true);
	});
});

describe('datasetToCsv', () => {
	it('writes network-local times, escaped headers and empty cells, never zeros', () => {
		const csv = datasetToCsv(
			{
				key: 'k',
				title: 'T',
				columns: [
					{ key: 'time', header: 'date', type: 'time' },
					{ key: 'a', header: 'Solar, utility (MW)', type: 'number' },
					{ key: 'b', header: 'Ok', type: 'boolean' }
				],
				rows: [
					{ time: Date.UTC(2026, 6, 1, 4, 30), a: 12.5, b: true },
					{ time: Date.UTC(2026, 6, 1, 5, 30), a: null, b: null }
				]
			},
			'+10:00'
		);
		expect(csv.split('\n')).toEqual([
			'date,"Solar, utility (MW)",Ok',
			'2026-07-01 14:30:00+10:00,12.5,true',
			'2026-07-01 15:30:00+10:00,,'
		]);
	});
});

describe('seriesDataset', () => {
	it('exports the visible series as drawn, headed with their unit, without band closes', () => {
		const time = Date.UTC(2026, 6, 1, 4, 30);
		const dataset = seriesDataset({
			key: 'generation',
			title: 'Generation',
			unit: 'MW',
			hidden: ['U2'],
			snapshot: {
				data: [
					{ time, U1: 10, U2: 5, P: 3 },
					{ time: time + 1, U1: 10, _bandClose: true }
				],
				seriesNames: ['U1', 'U2', 'P'],
				seriesLabels: { U1: 'Unit 1 (Wind)', P: 'Price (MW)' },
				seriesColours: {}
			}
		});
		expect(dataset?.columns.map((column) => column.header)).toEqual([
			'date',
			'Unit 1 (Wind) (MW)',
			'Price (MW)'
		]);
		expect(dataset?.rows).toHaveLength(1);
		expect(seriesDataset({ key: 'k', title: 't', unit: 'MW', snapshot: null })).toBeNull();
	});
});
