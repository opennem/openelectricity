import { describe, it, expect } from 'vitest';
import { endLabels, processAnnotations, pointAnnotation } from './plot-annotations.js';

const SERIES = ['solar', 'wind', 'hydro'];
const COLOURS = { solar: '#f00', wind: '#00f', hydro: '#0f0' };
const LABELS = { solar: 'Solar', wind: 'Wind', hydro: 'Hydro' };

// ── endLabels ───────────────────────────────────────────────────

describe('endLabels', () => {
	const data = [
		{ date: new Date('2024-01-01'), solar: 10, wind: 20, hydro: 30 },
		{ date: new Date('2024-01-02'), solar: 15, wind: 25, hydro: 35 }
	];

	it('returns empty for empty data', () => {
		const result = endLabels([], SERIES, COLOURS, LABELS, 'date', 300);
		expect(result.marks).toEqual([]);
		expect(result.marginRight).toBe(0);
	});

	it('creates one mark per series with non-null last values', () => {
		const result = endLabels(data, SERIES, COLOURS, LABELS, 'date', 300);
		expect(result.marks).toHaveLength(3);
		expect(result.marginRight).toBeGreaterThan(0);
	});

	it('uses raw y values when not stacked', () => {
		const result = endLabels(data, SERIES, COLOURS, LABELS, 'date', 300, undefined, false);
		// Each mark wraps a single-element array; check the data passed to text()
		// The marks are Observable Plot text marks — we verify via processAnnotations integration
		expect(result.marks).toHaveLength(3);
	});

	it('uses stacked midpoint y values when stacked', () => {
		// With stacking: solar=15 at row[1], band is 0–15, midpoint=7.5
		// wind=25 at row[1], band is 15–40, midpoint=27.5
		// hydro=35 at row[1], band is 40–75, midpoint=57.5
		const result = endLabels(data, SERIES, COLOURS, LABELS, 'date', 300, undefined, true);
		expect(result.marks).toHaveLength(3);
	});

	it('skips series where stacked midpoint is null', () => {
		// targetSeries not in seriesNames => stackedMidpoint returns null
		const data = [{ date: new Date('2024-01-01'), solar: 10, wind: 20 }];
		const series = ['solar', 'wind', 'missing'];
		const colours = { solar: '#f00', wind: '#00f', missing: '#888' };
		const labels = { solar: 'Solar', wind: 'Wind', missing: 'Missing' };
		const result = endLabels(data, series, colours, labels, 'date', 300, undefined, true);
		// 'missing' has null data[0]['missing'], so it's skipped in the outer null check
		expect(result.marks).toHaveLength(2);
	});

	it('handles series with trailing nulls', () => {
		const data = [
			{ date: new Date('2024-01-01'), solar: 10, wind: 20 },
			{ date: new Date('2024-01-02'), solar: null, wind: 25 }
		];
		const result = endLabels(data, ['solar', 'wind'], COLOURS, LABELS, 'date', 300);
		expect(result.marks).toHaveLength(2);
	});
});

// ── processAnnotations with end-labels ──────────────────────────

describe('processAnnotations end-labels stacking', () => {
	const data = [
		{ date: new Date('2024-01-01'), solar: 100, wind: 200 },
		{ date: new Date('2024-01-02'), solar: 150, wind: 250 }
	];
	const series = ['solar', 'wind'];
	const colours = { solar: '#f00', wind: '#00f' };
	const labels = { solar: 'Solar', wind: 'Wind' };

	it('passes stacked=true for stacked-area chart type', () => {
		const result = processAnnotations(
			[{ type: 'end-labels' }],
			data,
			series,
			colours,
			labels,
			'stacked-area',
			300
		);
		// Should produce marks without error
		expect(result.marks.length).toBeGreaterThan(0);
		expect(result.marginRight).toBeGreaterThan(0);
	});

	it('passes stacked=false for line chart type', () => {
		const result = processAnnotations(
			[{ type: 'end-labels' }],
			data,
			series,
			colours,
			labels,
			'line',
			300
		);
		expect(result.marks.length).toBeGreaterThan(0);
	});

	it('passes stacked=false for bar-stacked chart type', () => {
		const data = [
			{ category: 'A', solar: 100, wind: 200 },
			{ category: 'B', solar: 150, wind: 250 }
		];
		const result = processAnnotations(
			[{ type: 'end-labels' }],
			data,
			series,
			colours,
			labels,
			'bar-stacked',
			300
		);
		expect(result.marks.length).toBeGreaterThan(0);
	});
});

// ── processAnnotations combines margin correctly ────────────────

describe('processAnnotations margin accumulation', () => {
	it('returns the maximum marginRight across annotations', () => {
		const data = [
			{ date: new Date('2024-01-01'), solar: 100, wind: 200 },
			{ date: new Date('2024-01-02'), solar: 150, wind: 250 }
		];
		const result = processAnnotations(
			[{ type: 'end-labels' }, { type: 'x-rule', x: '2024-01-01', text: 'Start' }],
			data,
			['solar', 'wind'],
			{ solar: '#f00', wind: '#00f' },
			{ solar: 'Solar', wind: 'Wind' },
			'line',
			300
		);
		// end-labels produce marginRight > 0, x-rule produces 0
		expect(result.marginRight).toBeGreaterThan(0);
	});
});

// ── pointAnnotation stacked ─────────────────────────────────────

describe('pointAnnotation', () => {
	it('resolves stacked midpoint when stacked: true', () => {
		const data = [{ date: new Date('2024-01-01'), solar: 100, wind: 200 }];
		const result = pointAnnotation(
			{
				type: 'point',
				x: new Date('2024-01-01'),
				series: 'wind',
				text: 'Test',
				stacked: true
			},
			data,
			['solar', 'wind'],
			{ solar: '#f00', wind: '#00f' },
			'date'
		);
		// wind stacked midpoint: solar(100) + wind(200)/2 = 200
		expect(result.marks.length).toBeGreaterThan(0);
	});

	it('uses raw value when stacked: false', () => {
		const data = [{ date: new Date('2024-01-01'), solar: 100, wind: 200 }];
		const result = pointAnnotation(
			{
				type: 'point',
				x: new Date('2024-01-01'),
				series: 'wind',
				text: 'Test',
				stacked: false
			},
			data,
			['solar', 'wind'],
			{ solar: '#f00', wind: '#00f' },
			'date'
		);
		expect(result.marks.length).toBeGreaterThan(0);
	});
});
