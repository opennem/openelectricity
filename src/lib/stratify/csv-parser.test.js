import { describe, it, expect } from 'vitest';
import { parseCSV } from './csv-parser.js';

// ── _lineIndex with blank lines ─────────────────────────────────

describe('parseCSV _lineIndex with blank lines', () => {
	it('assigns correct _lineIndex in category mode without blank lines', () => {
		const csv = `Category,Value A,Value B
Apples,10,20
Bananas,30,40
Cherries,50,60`;

		const result = parseCSV(csv, {}, 'category');
		expect(result.data).toHaveLength(3);
		expect(result.data[0]._lineIndex).toBe(1);
		expect(result.data[1]._lineIndex).toBe(2);
		expect(result.data[2]._lineIndex).toBe(3);
	});

	it('assigns correct _lineIndex in category mode with blank lines', () => {
		const csv = `Category,Value A,Value B
Apples,10,20

Bananas,30,40

Cherries,50,60`;

		const result = parseCSV(csv, {}, 'category');
		expect(result.data).toHaveLength(3);
		// Line 0 is the header; dataLines index 0 = "Apples", 1 = blank, 2 = "Bananas", 3 = blank, 4 = "Cherries"
		expect(result.data[0]._lineIndex).toBe(1); // dataLines[0] + 1
		expect(result.data[1]._lineIndex).toBe(3); // dataLines[2] + 1
		expect(result.data[2]._lineIndex).toBe(5); // dataLines[4] + 1
	});

	it('assigns correct _lineIndex with multiple consecutive blank lines', () => {
		const csv = `Category,Value
A,1


B,2`;

		const result = parseCSV(csv, {}, 'category');
		expect(result.data).toHaveLength(2);
		expect(result.data[0]._lineIndex).toBe(1);
		expect(result.data[1]._lineIndex).toBe(4); // dataLines[3] + 1
	});

	it('assigns correct _lineIndex with trailing blank line', () => {
		const csv = `Category,Value
A,1
B,2
`;

		const result = parseCSV(csv, {}, 'category');
		expect(result.data).toHaveLength(2);
		expect(result.data[0]._lineIndex).toBe(1);
		expect(result.data[1]._lineIndex).toBe(2);
	});
});

// ── allColumns metadata ─────────────────────────────────────────

describe('parseCSV allColumns metadata', () => {
	describe('time-series mode', () => {
		it('marks first column as non-numeric and rest as numeric', () => {
			const csv = `Date,Solar,Wind
2024-01-01,10,20
2024-01-02,30,40`;

			const result = parseCSV(csv, {}, 'time-series');
			expect(result.allColumns).toHaveLength(3);
			expect(result.allColumns[0]).toEqual({ key: 'date', label: 'Date', isNumeric: false });
			expect(result.allColumns[1]).toEqual({ key: 'solar', label: 'Solar', isNumeric: true });
			expect(result.allColumns[2]).toEqual({ key: 'wind', label: 'Wind', isNumeric: true });
		});

		it('preserves original header labels', () => {
			const csv = `Date,My Column,Another Col
2024-01-01,10,20`;

			const result = parseCSV(csv, {}, 'time-series');
			expect(result.allColumns[1].label).toBe('My Column');
			expect(result.allColumns[2].label).toBe('Another Col');
		});

		it('uses normalised keys', () => {
			const csv = `Date,My Column
2024-01-01,10`;

			const result = parseCSV(csv, {}, 'time-series');
			expect(result.allColumns[1].key).toBe('my_column');
		});
	});

	describe('category mode', () => {
		it('marks first column as non-numeric', () => {
			const csv = `Region,Value
NSW,10
VIC,20`;

			const result = parseCSV(csv, {}, 'category');
			expect(result.allColumns[0]).toEqual({ key: 'region', label: 'Region', isNumeric: false });
		});

		it('marks numeric columns as isNumeric: true', () => {
			const csv = `Region,Capacity,Output
NSW,100,50
VIC,200,80`;

			const result = parseCSV(csv, {}, 'category');
			expect(result.allColumns[1]).toEqual({
				key: 'capacity',
				label: 'Capacity',
				isNumeric: true
			});
			expect(result.allColumns[2]).toEqual({ key: 'output', label: 'Output', isNumeric: true });
		});

		it('returns allColumns as empty array for empty input', () => {
			const result = parseCSV('', {});
			expect(result.allColumns).toEqual([]);
		});
	});
});

// ── Text column detection ───────────────────────────────────────

describe('parseCSV text column detection', () => {
	it('detects a fully text column as non-numeric', () => {
		const csv = `Region,Market,Value
NSW,NEM,100
VIC,NEM,200
SA,WEM,150`;

		const result = parseCSV(csv, {}, 'category');
		const marketCol = result.allColumns.find((c) => c.key === 'market');
		expect(marketCol?.isNumeric).toBe(false);
	});

	it('preserves raw text values for text columns', () => {
		const csv = `Region,Market,Value
NSW,NEM,100
VIC,NEM,200`;

		const result = parseCSV(csv, {}, 'category');
		expect(result.data[0].market).toBe('NEM');
		expect(result.data[1].market).toBe('NEM');
	});

	it('parses numeric columns as numbers', () => {
		const csv = `Region,Market,Value
NSW,NEM,100
VIC,NEM,200`;

		const result = parseCSV(csv, {}, 'category');
		expect(result.data[0].value).toBe(100);
		expect(result.data[1].value).toBe(200);
	});

	it('classifies column with <20% numeric values as text', () => {
		// 1 out of 6 = 16.7% numeric → text
		const csv = `Cat,Status
A,Active
B,Inactive
C,Pending
D,Active
E,42
F,Done`;

		const result = parseCSV(csv, {}, 'category');
		const statusCol = result.allColumns.find((c) => c.key === 'status');
		expect(statusCol?.isNumeric).toBe(false);
	});

	it('classifies column with >=20% numeric values as numeric', () => {
		// 2 out of 5 = 40% numeric → numeric
		const csv = `Cat,Mix
A,hello
B,10
C,world
D,20
E,foo`;

		const result = parseCSV(csv, {}, 'category');
		const mixCol = result.allColumns.find((c) => c.key === 'mix');
		expect(mixCol?.isNumeric).toBe(true);
	});

	it('excludes empty and dash values from detection counts', () => {
		// Only non-empty/non-dash values count: "hello" and "world" → 0/2 numeric → text
		const csv = `Cat,Notes
A,hello
B,
C,-
D,world`;

		const result = parseCSV(csv, {}, 'category');
		const notesCol = result.allColumns.find((c) => c.key === 'notes');
		expect(notesCol?.isNumeric).toBe(false);
	});

	it('sets empty text cells to null', () => {
		const csv = `Cat,Market
A,NEM
B,`;

		const result = parseCSV(csv, {}, 'category');
		expect(result.data[0].market).toBe('NEM');
		expect(result.data[1].market).toBeNull();
	});

	it('preserves text column in time-series mode (regression: was nulled by parseNumber)', () => {
		const csv = `Date,Region,Value
2024-01-01,NSW,100
2024-02-01,NSW,110
2024-01-01,VIC,200
2024-02-01,VIC,220`;

		const result = parseCSV(csv, {}, 'time-series');
		const regionCol = result.allColumns.find((c) => c.key === 'region');
		expect(regionCol?.isNumeric).toBe(false);
		// All four rows should keep their region label as a string
		const regions = result.data.map((d) => d.region);
		expect(regions).toEqual(expect.arrayContaining(['NSW', 'VIC']));
		expect(regions.every((r) => typeof r === 'string')).toBe(true);
	});

	it('does NOT auto-detect short integer columns as time-series (regression: hour 0-23 → year 1923)', () => {
		// xColumn = 'hour' (numeric 0-23) — auto-detect must pick `linear`, not
		// `time-series`. Previously the `yyyy` date format would parse "23" as
		// year 23 → 1923, making 100% of rows look like dates.
		const csv = `month,hour,value
2024-05,0,10
2024-05,1,12
2024-05,23,8`;

		const result = parseCSV(csv, {}, 'auto', 'hour');
		expect(result.mode).toBe('linear');
		expect(result.data[0].linear).toBe(0);
		expect(result.data[2].linear).toBe(23);
	});

	it('preserves text column in linear mode (regression: was nulled by parseNumber)', () => {
		// xColumn = 'hour' (numeric) → linear mode; 'month' is a non-numeric label column
		const csv = `month,hour,value
2024-05,0,1.5
2024-05,1,2.0
2024-06,0,3.5
2024-06,1,4.0`;

		const result = parseCSV(csv, {}, 'linear', 'hour');
		const monthCol = result.allColumns.find((c) => c.key === 'month');
		expect(monthCol?.isNumeric).toBe(false);
		const months = result.data.map((d) => d.month);
		expect(months).toEqual(expect.arrayContaining(['2024-05', '2024-06']));
		expect(months.every((m) => typeof m === 'string')).toBe(true);
	});
});

// ── timezone-less date parsing ──────────────────────────────────

describe('parseCSV timezone-less date parsing', () => {
	it('treats dates without a timezone marker as UTC wall-clock', () => {
		const csv = `Time,Value
2025-12-18 00:00:00,1
2025-12-18 14:00:00,2`;

		const result = parseCSV(csv, {}, 'time-series');
		expect(result.data).toHaveLength(2);

		const d0 = /** @type {Date} */ (result.data[0].date);
		expect(d0.getUTCFullYear()).toBe(2025);
		expect(d0.getUTCMonth()).toBe(11);
		expect(d0.getUTCDate()).toBe(18);
		expect(d0.getUTCHours()).toBe(0);
		expect(d0.getUTCMinutes()).toBe(0);

		const d1 = /** @type {Date} */ (result.data[1].date);
		expect(d1.getUTCHours()).toBe(14);
	});

	it('honours an explicit timezone offset on the input', () => {
		const csv = `Time,Value
2025-12-18T00:00:00+10:00,1`;

		const result = parseCSV(csv, {}, 'time-series');
		const d = /** @type {Date} */ (result.data[0].date);
		// 2025-12-18 00:00:00+10:00 → 2025-12-17 14:00:00 UTC
		expect(d.getUTCFullYear()).toBe(2025);
		expect(d.getUTCMonth()).toBe(11);
		expect(d.getUTCDate()).toBe(17);
		expect(d.getUTCHours()).toBe(14);
	});

	it('treats ISO 8601 with T separator and no TZ as UTC', () => {
		const csv = `Time,Value
2025-12-18T00:00:00,1`;

		const result = parseCSV(csv, {}, 'time-series');
		const d = /** @type {Date} */ (result.data[0].date);
		expect(d.getUTCHours()).toBe(0);
		expect(d.getUTCDate()).toBe(18);
	});
});
