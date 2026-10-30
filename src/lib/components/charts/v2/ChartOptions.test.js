import { describe, expect, it, vi } from 'vitest';
import ChartOptions from './ChartOptions.svelte.js';

describe('controlled chart transform events', () => {
	it('emits one event per user change, but none for restoring controlled state', () => {
		const options = new ChartOptions();
		const changed = vi.fn();
		options.onDataTransformChange = changed;
		options.setDataTransformType('proportion');
		options.setDataTransformType('proportion');
		expect(changed).toHaveBeenCalledExactlyOnceWith('proportion');
		options.selectedDataTransformType = 'absolute';
		expect(changed).toHaveBeenCalledTimes(1);
		options.setDataTransformType('changeSince');
		expect(changed).toHaveBeenLastCalledWith('changeSince');
	});
});

describe('ChartOptions display prefix selection', () => {
	it('allows automatic defaults until the user selects a prefix', () => {
		const options = new ChartOptions({
			prefix: 'M',
			displayPrefix: 'M',
			allowedPrefixes: ['M', 'G', 'T'],
			baseUnit: 'Wh'
		});

		options.setAutomaticDisplayPrefix('T');
		expect(options.displayPrefix).toBe('T');

		options.setDisplayPrefix('G');
		options.setAutomaticDisplayPrefix('T');
		expect(options.displayPrefix).toBe('G');
	});

	it('resets the manual selection when the unit family changes', () => {
		const options = new ChartOptions({ prefix: 'M', displayPrefix: 'M' });
		options.setDisplayPrefix('G');
		options.resetDisplayPrefix('M');
		options.setAutomaticDisplayPrefix('T');

		expect(options.displayPrefix).toBe('T');
	});

	it('treats cycling the header unit as a manual selection', () => {
		const options = new ChartOptions({
			prefix: 'M',
			displayPrefix: 'M',
			allowedPrefixes: ['M', 'G']
		});

		expect(options.cyclePrefix()).toBe('G');
		options.setAutomaticDisplayPrefix('M');
		expect(options.displayPrefix).toBe('G');
	});
});

describe('growth transform', () => {
	const comparison = { lag: 1, label: 'month-on-month', leadInMs: 1 };

	it('is offered only while the owner sets a comparison', () => {
		const options = new ChartOptions();
		expect(options.dataTransformOptions.map((option) => option.value)).not.toContain('growth');
		options.growthComparison = comparison;
		expect(options.dataTransformOptions.map((option) => option.value)).toContain('growth');
	});

	it('keeps a growth choice but shows absolute values where it is not offered', () => {
		const options = new ChartOptions();
		options.selectedDataTransformType = 'growth';
		expect(options.dataTransformType).toBe('absolute');
		expect(options.isDataTransformTypeGrowth).toBe(false);
		options.growthComparison = comparison;
		expect(options.dataTransformType).toBe('growth');
		expect(options.isDataTransformTypeGrowth).toBe(true);
	});

	it('locks the curve to step while growth applies', () => {
		const options = new ChartOptions({ curveType: 'smooth' });
		options.growthComparison = comparison;
		options.setDataTransformType('growth');
		expect(options.isCurveLocked).toBe(true);
		expect(options.curveType).toBe('step');
		options.setDataTransformType('absolute');
		expect(options.curveType).toBe('smooth');
	});
});
