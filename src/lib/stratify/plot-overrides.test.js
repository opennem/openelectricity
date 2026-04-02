import { describe, it, expect } from 'vitest';
import { applyPlotOverrides, resolveMarkSpec } from './plot-overrides.js';

// ── resolveMarkSpec ─────────────────────────────────────────────

describe('resolveMarkSpec', () => {
	it('resolves rule-y with data', () => {
		const mark = resolveMarkSpec({
			markType: 'rule-y',
			data: [100],
			options: { stroke: 'red', strokeWidth: 2 }
		});
		expect(mark).not.toBeNull();
	});

	it('resolves dot with channels', () => {
		const mark = resolveMarkSpec({
			markType: 'dot',
			data: [{ x: 1, y: 2 }],
			channels: { x: 'x', y: 'y' },
			options: { r: 5 }
		});
		expect(mark).not.toBeNull();
	});

	it('resolves frame without data', () => {
		const mark = resolveMarkSpec({
			markType: 'frame',
			options: { stroke: '#ccc' }
		});
		expect(mark).not.toBeNull();
	});

	it('resolves text with data and channels', () => {
		const mark = resolveMarkSpec({
			markType: 'text',
			data: [{ x: 0, y: 0 }],
			channels: { x: 'x', y: 'y', text: 'Hello' }
		});
		expect(mark).not.toBeNull();
	});

	it('returns null for unknown mark type', () => {
		const mark = resolveMarkSpec({ markType: 'nonexistent' });
		expect(mark).toBeNull();
	});

	it('handles spec with no channels or options', () => {
		const mark = resolveMarkSpec({
			markType: 'rule-y',
			data: [0]
		});
		expect(mark).not.toBeNull();
	});

	it('resolves simple mark types without error', () => {
		// These marks work with empty data or no data
		const simpleTypes = [
			'dot',
			'dot-x',
			'dot-y',
			'line',
			'line-x',
			'line-y',
			'bar-x',
			'bar-y',
			'text',
			'text-x',
			'text-y',
			'rule-x',
			'rule-y',
			'tick-x',
			'tick-y',
			'frame',
			'image'
		];
		for (const markType of simpleTypes) {
			const mark = resolveMarkSpec({
				markType,
				...(markType === 'frame' ? {} : { data: [] })
			});
			expect(mark, `${markType} should resolve`).not.toBeNull();
		}
	});

	it('resolves marks that require channels with proper data', () => {
		const sampleData = [{ x: 1, y: 2, x1: 0, x2: 1, y1: 0, y2: 2 }];
		const channelTypes = [
			'area',
			'area-x',
			'area-y',
			'rect',
			'rect-x',
			'rect-y',
			'cell',
			'cell-x',
			'arrow',
			'vector',
			'link',
			'waffle-x',
			'waffle-y'
		];
		for (const markType of channelTypes) {
			const mark = resolveMarkSpec({
				markType,
				data: sampleData,
				channels: { x: 'x', y: 'y', x1: 'x1', x2: 'x2', y1: 'y1', y2: 'y2' }
			});
			expect(mark, `${markType} should resolve`).not.toBeNull();
		}
	});
});

// ── applyPlotOverrides ──────────────────────────────────────────

describe('applyPlotOverrides', () => {
	const baseOptions = {
		style: { fontFamily: 'monospace' },
		x: { label: null, grid: false },
		y: { label: null, grid: true },
		color: { domain: ['a', 'b'], legend: true },
		marks: [{ _type: 'existing-mark' }]
	};

	it('returns baseOptions unchanged when overrides is null', () => {
		const result = applyPlotOverrides(baseOptions, null);
		expect(result).toEqual(baseOptions);
	});

	it('returns baseOptions unchanged when overrides is undefined', () => {
		const result = applyPlotOverrides(baseOptions, undefined);
		expect(result).toEqual(baseOptions);
	});

	it('returns baseOptions unchanged when overrides is empty object', () => {
		const result = applyPlotOverrides(baseOptions, {});
		expect(result).toEqual(baseOptions);
	});

	it('merges x-scale overrides', () => {
		const result = applyPlotOverrides(baseOptions, {
			x: { type: 'log', nice: true }
		});
		expect(result.x).toEqual({ label: null, grid: false, type: 'log', nice: true });
	});

	it('merges y-scale overrides', () => {
		const result = applyPlotOverrides(baseOptions, {
			y: { tickFormat: '.0f', zero: true }
		});
		expect(result.y).toEqual({ label: null, grid: true, tickFormat: '.0f', zero: true });
	});

	it('merges colour scale overrides', () => {
		const result = applyPlotOverrides(baseOptions, {
			color: { scheme: 'blues' }
		});
		expect(result.color.scheme).toBe('blues');
		expect(result.color.domain).toEqual(['a', 'b']);
	});

	it('adds fx/fy when not in base', () => {
		const result = applyPlotOverrides(baseOptions, {
			fx: { label: null, padding: 0.2 },
			fy: { label: 'Category' }
		});
		expect(result.fx).toEqual({ label: null, padding: 0.2 });
		expect(result.fy).toEqual({ label: 'Category' });
	});

	it('adds r and opacity scales', () => {
		const result = applyPlotOverrides(baseOptions, {
			r: { range: [2, 10] },
			opacity: { domain: [0, 1] }
		});
		expect(result.r).toEqual({ range: [2, 10] });
		expect(result.opacity).toEqual({ domain: [0, 1] });
	});

	it('applies layout title and subtitle', () => {
		const result = applyPlotOverrides(baseOptions, {
			layout: { title: 'My Chart', subtitle: 'A subtitle' }
		});
		expect(result.title).toBe('My Chart');
		expect(result.subtitle).toBe('A subtitle');
	});

	it('applies layout caption', () => {
		const result = applyPlotOverrides(baseOptions, {
			layout: { caption: 'Source: data.gov' }
		});
		expect(result.caption).toBe('Source: data.gov');
	});

	it('applies layout margins', () => {
		const result = applyPlotOverrides(baseOptions, {
			layout: { marginTop: 20, marginRight: 40, marginBottom: 30, marginLeft: 60 }
		});
		expect(result.marginTop).toBe(20);
		expect(result.marginRight).toBe(40);
		expect(result.marginBottom).toBe(30);
		expect(result.marginLeft).toBe(60);
	});

	it('applies layout insets', () => {
		const result = applyPlotOverrides(baseOptions, {
			layout: { insetTop: 5, insetRight: 10, insetBottom: 5, insetLeft: 10 }
		});
		expect(result.insetTop).toBe(5);
		expect(result.insetRight).toBe(10);
	});

	it('does not clobber existing marks when adding extra marks', () => {
		const result = applyPlotOverrides(baseOptions, {
			extraMarks: [{ markType: 'rule-y', data: [100], options: { stroke: 'red' } }]
		});
		// Original mark still first
		expect(result.marks[0]).toEqual({ _type: 'existing-mark' });
		// New mark appended
		expect(result.marks.length).toBe(2);
	});

	it('skips unknown mark types in extraMarks', () => {
		const result = applyPlotOverrides(baseOptions, {
			extraMarks: [{ markType: 'nonexistent' }, { markType: 'rule-y', data: [0] }]
		});
		// Only the valid mark gets appended
		expect(result.marks.length).toBe(2);
	});

	it('handles empty extraMarks array', () => {
		const result = applyPlotOverrides(baseOptions, { extraMarks: [] });
		expect(result.marks).toEqual(baseOptions.marks);
	});

	it('combines scale, layout, and mark overrides', () => {
		const result = applyPlotOverrides(baseOptions, {
			x: { type: 'band' },
			layout: { title: 'Test', marginLeft: 50 },
			extraMarks: [{ markType: 'rule-y', data: [0] }]
		});
		expect(result.x.type).toBe('band');
		expect(result.title).toBe('Test');
		expect(result.marginLeft).toBe(50);
		expect(result.marks.length).toBe(2);
	});
});
