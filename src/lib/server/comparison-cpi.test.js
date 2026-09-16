import { describe, it, expect, vi } from 'vitest';
import { loadComparisonCpi } from './comparison-cpi.js';
import { cpiSnapshot } from '../comparison-cpi.fixtures.js';

describe('comparison CPI loading', () => {
	it('works locally without a binding or network request', async () => {
		const result = await loadComparisonCpi(undefined);
		expect(result.values).toHaveLength(cpiSnapshot().observations.length);
		expect(result.source).toContain('abs.gov.au');
	});
	it('reads a revised KV dataset through its binding', async () => {
		const snapshot = cpiSnapshot();
		snapshot.observations[0].value += 0.1;
		const get = vi.fn().mockResolvedValue(snapshot);
		const result = await loadComparisonCpi(/** @type {any} */ ({ env: { CPI_DATA: { get } } }));
		expect(result.values[0].value).toBe(snapshot.observations[0].value);
		expect(get).toHaveBeenCalledWith('abs-cpi-quarterly-v1', { type: 'json', cacheTtl: 3600 });
	});
	it('falls back to the bundled snapshot when KV fails or is corrupt', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		try {
			for (const get of [
				vi.fn().mockRejectedValue(new Error('offline')),
				vi.fn().mockResolvedValue({})
			]) {
				const result = await loadComparisonCpi(/** @type {any} */ ({ env: { CPI_DATA: { get } } }));
				expect(result.values[0].value).toBe(cpiSnapshot().observations[0].value);
			}
		} finally {
			warn.mockRestore();
		}
	});
});
