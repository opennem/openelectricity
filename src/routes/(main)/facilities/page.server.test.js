import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getFacilities: vi.fn(),
	getCachedFacilities: vi.fn(),
	setCachedFacilities: vi.fn(),
	fetchFacilityPhotos: vi.fn()
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

vi.mock('./_utils/fetch-facility-photos.js', () => ({
	fetchFacilityPhotos: mocks.fetchFacilityPhotos
}));

import { load } from './+page.server.js';

const commissioningFacility = {
	code: 'TEST',
	network_region: 'NSW1',
	units: [{ code: 'TEST1', status_id: 'commissioning', max_generation: 40 }]
};

describe('/facilities server load', () => {
	beforeEach(() => {
		mocks.getFacilities.mockReset().mockResolvedValue({
			response: { data: [commissioningFacility] }
		});
		mocks.getCachedFacilities.mockReset().mockReturnValue(null);
		mocks.setCachedFacilities.mockReset();
		mocks.fetchFacilityPhotos.mockReset().mockResolvedValue({});
	});

	it('forwards a commissioning-only selection to OE unchanged', async () => {
		const result = await load(
			/** @type {any} */ ({
				url: new URL('http://localhost/facilities?statuses=commissioning')
			})
		);

		expect(mocks.getFacilities).toHaveBeenCalledWith({
			fueltech_id: [],
			status_id: ['commissioning']
		});
		expect(result.facilities).toEqual([commissioningFacility]);
		expect(result.facilities[0].units[0]).not.toHaveProperty('isCommissioning');
	});

	it('forwards the operating and commissioning defaults to OE', async () => {
		await load(/** @type {any} */ ({ url: new URL('http://localhost/facilities') }));

		expect(mocks.getFacilities).toHaveBeenCalledWith({
			fueltech_id: [],
			status_id: ['operating', 'commissioning']
		});
	});

	it('returns an empty facility list when OE fails', async () => {
		mocks.getFacilities.mockRejectedValue(new Error('upstream unavailable'));

		const result = await load(
			/** @type {any} */ ({
				url: new URL('http://localhost/facilities?statuses=commissioning')
			})
		);

		expect(result.facilities).toEqual([]);
	});
});
