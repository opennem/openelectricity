import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getFacilityData: vi.fn() }));

vi.mock('openelectricity', () => ({
	OpenElectricityClient: class {
		getFacilityData = mocks.getFacilityData;
	},
	NoDataFound: class NoDataFound extends Error {}
}));

import { GET, _parseFacilityComparisonQuery } from './+server.js';

/** @param {string} search */
function request(search) {
	return GET(
		/** @type {any} */ ({
			url: new URL(`https://example.test/api/facilities/compare?${search}`),
			setHeaders: vi.fn()
		})
	);
}

describe('facility comparison endpoint', () => {
	beforeEach(() => {
		mocks.getFacilityData.mockReset().mockResolvedValue({ response: { data: [] } });
	});

	it('requires two to six unique facilities on one supported network', () => {
		expect(
			_parseFacilityComparisonQuery(new URLSearchParams('network_id=NEM&facility_code=A'))
		).toEqual({
			error: 'Choose between two and six facilities.'
		});
		expect(
			_parseFacilityComparisonQuery(
				new URLSearchParams('network_id=NEM&facility_code=A&facility_code=A')
			)
		).toEqual({ error: 'Choose between two and six facilities.' });
	});

	it('rejects incompatible metrics, intervals and ranges before calling OE', async () => {
		const response = await request(
			'network_id=NEM&facility_code=A&facility_code=B&metric=energy&interval=5m'
		);
		expect(response.status).toBe(400);
		expect(mocks.getFacilityData).not.toHaveBeenCalled();

		const tooWide = await request(
			'network_id=NEM&facility_code=A&facility_code=B&metric=power&interval=5m&date_start=2026-01-01&date_end=2026-02-01'
		);
		expect(tooWide.status).toBe(400);
		expect(await tooWide.json()).toEqual({ error: '5m requests can cover at most 30 days.' });
	});

	it('passes a comparison query to the SDK and sets an edge-cache header', async () => {
		const setHeaders = vi.fn();
		const response = await GET(
			/** @type {any} */ ({
				url: new URL(
					'https://example.test/api/facilities/compare?network_id=NEM&facility_code=A&facility_code=B&metric=power&interval=1h&date_start=2026-01-01&date_end=2026-01-02'
				),
				setHeaders
			})
		);

		expect(response.status).toBe(200);
		expect(mocks.getFacilityData).toHaveBeenCalledWith('NEM', ['A', 'B'], ['power'], {
			interval: '1h',
			dateStart: '2026-01-01',
			dateEnd: '2026-01-02'
		});
		expect(setHeaders).toHaveBeenCalledWith({ 'Cache-Control': 'public, max-age=300' });
	});
});
