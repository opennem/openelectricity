import { describe, it, expect } from 'vitest';
import { resolveMetricKeys } from './metric-definitions.js';

describe('resolveMetricKeys', () => {
	it('adds storage duration to non-battery groups when the facility has battery units', () => {
		for (const group of ['coal', 'gas', 'wind', 'solar', 'hydro', 'other']) {
			const withStorage = resolveMetricKeys(/** @type {any} */ (group), { hasStorage: true });
			const without = resolveMetricKeys(/** @type {any} */ (group), {});
			expect(withStorage).toContain('storageDuration');
			expect(without).not.toContain('storageDuration');
		}
	});

	it('keeps the battery group list unchanged (already includes storage duration)', () => {
		const keys = resolveMetricKeys('battery', { hasStorage: true });
		expect(keys.filter((k) => k === 'storageDuration')).toHaveLength(1);
		expect(keys).toEqual([
			'netRevenue',
			'storageDuration',
			'roundTrip',
			'totalEnergy',
			'capacityFactor'
		]);
	});

	it('adds round trip for pumped hydro', () => {
		expect(resolveMetricKeys('hydro', { isPumpedHydro: true })).toContain('roundTrip');
		expect(resolveMetricKeys('hydro', {})).not.toContain('roundTrip');
	});

	it('conditional extras compose (solar dcac + storage)', () => {
		const keys = resolveMetricKeys('solar', { hasDcAc: true, hasStorage: true });
		expect(keys).toContain('dcac');
		expect(keys[keys.length - 1]).toBe('storageDuration');
	});
});
