import { describe, it, expect } from 'vitest';
import { retiredHatch } from './retired-hatch.js';

describe('retiredHatch', () => {
	it('defaults to a light 1px/8px hatch', () => {
		expect(retiredHatch()).toBe(
			'repeating-linear-gradient(135deg, rgba(255,255,255,0.16) 0px, rgba(255,255,255,0.16) 1px, transparent 1px, transparent 8px)'
		);
	});

	it('flips to a dark hatch for light backgrounds', () => {
		expect(retiredHatch({ dark: true })).toContain('rgba(0,0,0,0.10)');
		expect(retiredHatch({ dark: true })).not.toContain('rgba(255,255,255');
	});

	it('scales the line and period together for the OG canvas', () => {
		expect(retiredHatch({ scale: 2 })).toContain('2px, transparent 2px, transparent 16px');
	});
});
