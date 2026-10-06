import { describe, expect, it } from 'vitest';
import { describeDataChange, describeFieldValue, isColourValue } from './field-values.js';

describe('describeFieldValue', () => {
	it('summarises data by its shape', () => {
		expect(describeFieldValue('csvText', 'date,solar,wind\n2024-01-01,1,2\n2024-02-01,3,4')).toBe(
			'2 rows × 3 columns'
		);
		expect(describeFieldValue('csvText', 'date\tsolar\n2024-01-01\t1')).toBe('1 row × 2 columns');
		expect(describeFieldValue('csvText', '')).toBe('No data');
	});

	it('describes scalars', () => {
		expect(describeFieldValue('title', 'Generation')).toBe('Generation');
		expect(describeFieldValue('title', '')).toBe('None');
		expect(describeFieldValue('y1Min', null)).toBe('None');
		expect(describeFieldValue('showLegend', false)).toBe('Off');
		expect(describeFieldValue('chartHeight', 0)).toBe('0');
	});

	it('lists short arrays and maps, and counts long or nested ones', () => {
		expect(describeFieldValue('hiddenSeries', ['solar', 'wind'])).toBe('solar, wind');
		expect(describeFieldValue('hiddenSeries', [])).toBe('None');
		expect(describeFieldValue('seriesOrder', ['a', 'b', 'c', 'd', 'e'])).toBe('5 items');
		expect(describeFieldValue('userSeriesColours', { solar: '#ff0' })).toBe('solar: #ff0');
		expect(describeFieldValue('annotationItems', [{ id: 1 }])).toBe('1 item');
		expect(describeFieldValue('plotOverrides', { x: { grid: true } })).toBe('1 setting');
	});

	it('truncates long text', () => {
		const text = describeFieldValue('notes', 'x'.repeat(200));
		expect(text).toHaveLength(80);
		expect(text.endsWith('…')).toBe(true);
	});
});

describe('isColourValue', () => {
	it('recognises hex colours only', () => {
		expect(isColourValue('#3b82f6')).toBe(true);
		expect(isColourValue('#fff')).toBe(true);
		expect(isColourValue('blue')).toBe(false);
		expect(isColourValue(null)).toBe(false);
	});
});

describe('describeDataChange', () => {
	const base = 'date,solar,hydro\n2024-01-01,1,2\n2024-02-01,3,4';

	it('reports rows and columns added or removed', () => {
		expect(
			describeDataChange(base, 'date,solar,wind\n2024-01-01,1,2\n2024-02-01,3,4\n2024-03-01,5,6')
		).toBe('+1 row · added wind · removed hydro');
		expect(describeDataChange(base, 'date,solar,hydro\n2024-01-01,1,2')).toBe('−1 row');
	});

	it('falls back to an edit note when the shape is unchanged', () => {
		expect(describeDataChange(base, base.replace('3,4', '3,5'))).toBe('Values edited');
	});

	it('describes data appearing or disappearing', () => {
		expect(describeDataChange(undefined, base)).toBe('Added 2 rows × 3 columns');
		expect(describeDataChange(base, '')).toBe('Removed all data');
	});
});
