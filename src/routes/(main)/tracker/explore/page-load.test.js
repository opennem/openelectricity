import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getFacilities: vi.fn() }));

vi.mock('openelectricity', () => ({
	OpenElectricityClient: class {
		getFacilities = mocks.getFacilities;
	}
}));

import { load } from './+page.server.js';

describe('Tracker Explore server load', () => {
	beforeEach(() => {
		mocks.getFacilities.mockReset().mockResolvedValue({
			response: {
				data: [
					{
						code: 'W',
						name: 'Zulu',
						network_id: 'WEM',
						units: [{ code: 'W1', dispatch_type: 'LOAD' }]
					},
					{
						code: 'A',
						name: 'Alpha',
						network_id: 'NEM',
						units: [{ code: 'A1', fueltech_id: 'wind' }]
					},
					{ code: 'X', name: 'Ignored', network_id: 'OTHER', units: [] }
				]
			}
		});
	});

	it('returns sorted, minimal facility metadata for both supported networks', async () => {
		const setHeaders = vi.fn();
		const result = await load(/** @type {any} */ ({ setHeaders }));

		expect(result.facilities.map((facility) => facility.code)).toEqual(['A', 'W']);
		expect(result.facilities[0]).toEqual({
			code: 'A',
			name: 'Alpha',
			network_id: 'NEM',
			network_region: undefined,
			units: [{ code: 'A1', fueltech_id: 'wind', dispatch_type: undefined }]
		});
		expect(result.fullscreen).toBe(true);
		expect(setHeaders).toHaveBeenCalledWith({ 'cache-control': 'public, max-age=1800' });
	});

	it('keeps the builder usable when the facilities request fails', async () => {
		mocks.getFacilities.mockRejectedValue(new Error('upstream unavailable'));
		const result = await load(/** @type {any} */ ({ setHeaders: vi.fn() }));
		expect(result.facilities).toEqual([]);
	});
});
