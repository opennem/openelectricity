import { describe, expect, it } from 'vitest';
import ChartOptions from './ChartOptions.svelte.js';

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
