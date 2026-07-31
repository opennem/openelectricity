import { describe, expect, it } from 'vitest';
import {
	contrastText,
	displayCode,
	formatDispatchLabel,
	formatPrice,
	numberOrUndefined
} from './format.js';

describe('formatPrice', () => {
	it('rounds and prefixes the dollar sign', () => {
		expect(formatPrice(87.4)).toBe('$87');
		expect(formatPrice(87.6)).toBe('$88');
	});

	it('keeps the minus ahead of the dollar sign', () => {
		expect(formatPrice(-12.3)).toBe('-$12');
	});
});

describe('contrastText', () => {
	it('uses black on light backgrounds and white on dark', () => {
		expect(contrastText('#F2F1EE')).toBe('#000000');
		expect(contrastText('#222222')).toBe('#ffffff');
	});
});

describe('displayCode', () => {
	it('resolves region codes through the shared registry', () => {
		expect(displayCode('NSW1')).toBe('NSW');
		expect(displayCode('WEM')).toBe('WA');
	});

	it('falls back to the raw code for unknown regions', () => {
		expect(displayCode('XYZ9')).toBe('XYZ9');
	});
});

describe('numberOrUndefined', () => {
	it('passes finite numbers and rejects everything else', () => {
		expect(numberOrUndefined(0)).toBe(0);
		expect(numberOrUndefined(-42.5)).toBe(-42.5);
		expect(numberOrUndefined(NaN)).toBeUndefined();
		expect(numberOrUndefined(Infinity)).toBeUndefined();
		expect(numberOrUndefined(null)).toBeUndefined();
		expect(numberOrUndefined(undefined)).toBeUndefined();
	});
});

describe('formatDispatchLabel', () => {
	it('renders the dispatch time in NEM local time', () => {
		const label = formatDispatchLabel('2026-07-24T14:25:00+10:00');
		expect(label).toContain('Jul');
		expect(label).toContain('24');
	});

	it('returns empty for absent input', () => {
		expect(formatDispatchLabel('')).toBe('');
	});
});
