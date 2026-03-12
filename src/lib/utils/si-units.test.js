import { describe, it, expect } from 'vitest';
import { formatSI } from './si-units.js';

describe('formatSI', () => {
	it('converts MW to GW with auto decimals', () => {
		expect(formatSI(1500, { fromPrefix: 'M', toPrefix: 'G', baseUnit: 'W' })).toBe('1.5 GW');
	});

	it('converts MW to GW for large values', () => {
		expect(formatSI(42000, { fromPrefix: 'M', toPrefix: 'G', baseUnit: 'W' })).toBe('42 GW');
	});

	it('converts kt to Mt', () => {
		expect(formatSI(500, { fromPrefix: 'k', toPrefix: 'M', baseUnit: 't' })).toBe('0.5 Mt');
	});

	it('formats without baseUnit', () => {
		expect(formatSI(1234, { fromPrefix: '', toPrefix: 'k' })).toBe('1.23');
	});

	it('returns em-dash for null', () => {
		expect(formatSI(null)).toBe('—');
	});

	it('returns em-dash for undefined', () => {
		expect(formatSI(undefined)).toBe('—');
	});

	it('returns em-dash for NaN', () => {
		expect(formatSI(NaN)).toBe('—');
	});

	it('handles zero', () => {
		expect(formatSI(0, { fromPrefix: 'M', toPrefix: 'G', baseUnit: 'W' })).toBe('0 GW');
	});

	it('handles same prefix (no conversion)', () => {
		expect(formatSI(250, { fromPrefix: 'M', toPrefix: 'M', baseUnit: 'W' })).toBe('250 MW');
	});

	it('respects explicit maximumFractionDigits', () => {
		expect(
			formatSI(1500, { fromPrefix: 'M', toPrefix: 'G', baseUnit: 'W', maximumFractionDigits: 0 })
		).toBe('2 GW');
	});

	it('uses grouping by default for large numbers', () => {
		expect(formatSI(1234567, { fromPrefix: '', toPrefix: '', baseUnit: 'W' })).toBe(
			'1,234,567 W'
		);
	});

	it('disables grouping when useGrouping is false', () => {
		expect(
			formatSI(1234567, { fromPrefix: '', toPrefix: '', baseUnit: 'W', useGrouping: false })
		).toBe('1234567 W');
	});

	it('auto-selects 2 decimals for small values', () => {
		expect(formatSI(5.678, { fromPrefix: '', toPrefix: '' })).toBe('5.68');
	});

	it('auto-selects 1 decimal for medium values', () => {
		expect(formatSI(56.78, { fromPrefix: '', toPrefix: '' })).toBe('56.8');
	});

	it('auto-selects 0 decimals for large values', () => {
		expect(formatSI(567.8, { fromPrefix: '', toPrefix: '' })).toBe('568');
	});

	it('handles negative values', () => {
		expect(formatSI(-1500, { fromPrefix: 'M', toPrefix: 'G', baseUnit: 'W' })).toBe('-1.5 GW');
	});

	it('converts GWh to TWh', () => {
		expect(formatSI(1200, { fromPrefix: 'G', toPrefix: 'T', baseUnit: 'Wh' })).toBe('1.2 TWh');
	});

	it('works with default options (no conversion)', () => {
		expect(formatSI(42)).toBe('42');
	});
});
