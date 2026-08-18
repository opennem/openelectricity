import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PLAY_STATUSES } from '$lib/facilities/filters.js';

const mocks = vi.hoisted(() => ({
	getFacilities: vi.fn(),
	getCachedFacilities: vi.fn(),
	setCachedFacilities: vi.fn()
}));

vi.mock('openelectricity', () => ({
	OpenElectricityClient: class {
		getFacilities = mocks.getFacilities;
	}
}));

vi.mock('$lib/server/facilities-server-cache.js', () => ({
	getCachedFacilities: mocks.getCachedFacilities,
	setCachedFacilities: mocks.setCachedFacilities
}));

import { GET } from './+server.js';

describe('GET /api/facilities/all', () => {
	beforeEach(() => {
		mocks.getFacilities.mockReset().mockResolvedValue({
			response: {
				data: [
					{
						code: 'TEST',
						units: [{ code: 'TEST1', status_id: 'commissioning' }]
					}
				]
			}
		});
		mocks.getCachedFacilities.mockReset().mockReturnValue(null);
		mocks.setCachedFacilities.mockReset();
	});

	it('forwards every play status to OE and preserves native statuses', async () => {
		const setHeaders = vi.fn();
		const response = await GET(/** @type {any} */ ({ setHeaders }));
		const facilities = await response.json();

		expect(mocks.getFacilities).toHaveBeenCalledWith({
			fueltech_id: [],
			status_id: PLAY_STATUSES
		});
		expect(facilities[0].units[0]).toEqual({ code: 'TEST1', status_id: 'commissioning' });
		expect(mocks.setCachedFacilities).toHaveBeenCalled();
	});

	it('does not cache an upstream failure', async () => {
		mocks.getFacilities.mockRejectedValue(new Error('upstream unavailable'));

		const response = await GET(/** @type {any} */ ({ setHeaders: vi.fn() }));

		expect(await response.json()).toEqual([]);
		expect(mocks.setCachedFacilities).not.toHaveBeenCalled();
	});
});
