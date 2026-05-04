import { describe, it, expect } from 'vitest';
import { safeParseJSON, normaliseChart } from './chart-data.js';

// ── safeParseJSON ───────────────────────────────────────────────

describe('safeParseJSON', () => {
	it('parses valid JSON strings', () => {
		expect(safeParseJSON('{"a":1}', {})).toEqual({ a: 1 });
		expect(safeParseJSON('[1,2,3]', [])).toEqual([1, 2, 3]);
		expect(safeParseJSON('"hello"', '')).toBe('hello');
	});

	it('returns fallback for invalid JSON strings', () => {
		expect(safeParseJSON('not json', {})).toEqual({});
		expect(safeParseJSON('{broken', [])).toEqual([]);
	});

	it('passes through non-string values', () => {
		const obj = { a: 1 };
		expect(safeParseJSON(obj, {})).toBe(obj);
		expect(safeParseJSON(42, 0)).toBe(42);
		expect(safeParseJSON(true, false)).toBe(true);
	});

	it('returns fallback for null/undefined', () => {
		expect(safeParseJSON(null, 'default')).toBe('default');
		expect(safeParseJSON(undefined, 'default')).toBe('default');
	});
});

// ── normaliseChart ──────────────────────────────────────────────

describe('normaliseChart', () => {
	it('applies defaults for a minimal chart', () => {
		const result = normaliseChart({ _id: 'abc123' });

		expect(result._id).toBe('abc123');
		expect(result.title).toBe('');
		expect(result.description).toBe('');
		expect(result.csvText).toBe('');
		expect(result.chartType).toBe('line');
		expect(result.displayMode).toBe('auto');
		expect(result.hiddenSeries).toEqual([]);
		expect(result.userSeriesColours).toEqual({});
		expect(result.userSeriesLabels).toEqual({});
		expect(result.annotations).toEqual([]);
		expect(result.seriesChartTypes).toEqual({});
		expect(result.seriesLineStyles).toEqual({});
		expect(result.plotOverrides).toBeNull();
		expect(result.seriesOrder).toEqual([]);
		expect(result.stylePreset).toBe('sans');
		expect(result.colourPalette).toBe('oe-energy');
		expect(result.showLegend).toBe(true);
		expect(result.showBranding).toBe(true);
		expect(result.chartHeight).toBe(250);
		expect(result.xTicks).toBe(0);
		expect(result.xTickRotate).toBe(0);
		expect(result.marginBottom).toBe(0);
		expect(result.yTicks).toBe(0);
		expect(result.yMinMax).toBe(false);
		expect(result.y2Ticks).toBe(0);
		expect(result.y2MinMax).toBe(false);
		expect(result.tooltipColumns).toEqual([]);
		expect(result.xColumn).toBe('');
		expect(result.categorySort).toBe('default');
		expect(result.showXTickLabels).toBe(true);
		expect(result.colourSeries).toBeNull();
		expect(result.facetColumn).toBeNull();
		expect(result.xLabel).toBe('');
		expect(result.yLabel).toBe('');
		expect(result.seriesYAxis).toEqual({});
		expect(result.y2Label).toBe('');
	});

	it('preserves provided values', () => {
		const result = normaliseChart({
			_id: 'chart1',
			title: 'My Chart',
			description: 'A description',
			csvText: 'date,value\n2024-01-01,100',
			chartType: 'bar-stacked',
			chartHeight: 600,
			stylePreset: 'oe',
			showBranding: false,
			xLabel: 'Year',
			yLabel: 'GWh'
		});

		expect(result.title).toBe('My Chart');
		expect(result.description).toBe('A description');
		expect(result.csvText).toBe('date,value\n2024-01-01,100');
		expect(result.chartType).toBe('column-stacked');
		expect(result.chartHeight).toBe(600);
		expect(result.stylePreset).toBe('oe');
		expect(result.showBranding).toBe(false);
		expect(result.xLabel).toBe('Year');
		expect(result.yLabel).toBe('GWh');
	});

	it('parses JSON string fields', () => {
		const result = normaliseChart({
			_id: 'chart2',
			userSeriesColours: '{"Solar":"#ff0"}',
			userSeriesLabels: '{"solar_gen":"Solar Generation"}',
			annotations: '[{"type":"line","x":"2024-01-01"}]',
			seriesChartTypes: '{"wind":"line"}',
			seriesLineStyles: '{"solar":"dashed","wind":"dotted"}',
			seriesYAxis: '{"price":"right"}'
		});

		expect(result.userSeriesColours).toEqual({ Solar: '#ff0' });
		expect(result.userSeriesLabels).toEqual({ 'solar_gen': 'Solar Generation' });
		expect(result.annotations).toEqual([{ type: 'line', x: '2024-01-01' }]);
		expect(result.seriesChartTypes).toEqual({ wind: 'line' });
		expect(result.seriesLineStyles).toEqual({ solar: 'dashed', wind: 'dotted' });
		expect(result.seriesYAxis).toEqual({ price: 'right' });
	});

	it('handles invalid JSON strings gracefully', () => {
		const result = normaliseChart({
			_id: 'chart3',
			userSeriesColours: '{bad json',
			annotations: 'not an array',
			plotOverrides: '{{{',
			seriesLineStyles: '{bad'
		});

		expect(result.userSeriesColours).toEqual({});
		expect(result.annotations).toEqual([]);
		expect(result.seriesLineStyles).toEqual({});
		expect(result.plotOverrides).toBeNull();
	});

	it('preserves showLegend: false', () => {
		const result = normaliseChart({ _id: 'chart-legend-off', showLegend: false });
		expect(result.showLegend).toBe(false);
	});

	it('preserves showLegend: true explicitly', () => {
		const result = normaliseChart({ _id: 'chart-legend-on', showLegend: true });
		expect(result.showLegend).toBe(true);
	});

	it('preserves facetColumn when provided', () => {
		const result = normaliseChart({ _id: 'chart-facet', facetColumn: 'region' });
		expect(result.facetColumn).toBe('region');
	});

	it('defaults animateAsOneChart to false', () => {
		const result = normaliseChart({ _id: 'chart-anim-default' });
		expect(result.animateAsOneChart).toBe(false);
	});

	it('preserves animateAsOneChart: true', () => {
		const result = normaliseChart({ _id: 'chart-anim', animateAsOneChart: true });
		expect(result.animateAsOneChart).toBe(true);
	});

	it('does not include extra fields from the raw document', () => {
		const result = normaliseChart({
			_id: 'chart4',
			_createdAt: '2024-01-01',
			_updatedAt: '2024-06-01',
			userId: 'user_abc',
			status: 'published',
			unknownField: 'should not appear'
		});

		expect(result).not.toHaveProperty('_createdAt');
		expect(result).not.toHaveProperty('_updatedAt');
		expect(result).not.toHaveProperty('userId');
		expect(result).not.toHaveProperty('status');
		expect(result).not.toHaveProperty('unknownField');
	});
});
