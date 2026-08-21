import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	getMarket: vi.fn(),
	getNetworkData: vi.fn()
}));

vi.mock('openelectricity', () => ({
	OpenElectricityClient: class {
		getMarket = mocks.getMarket;
		getNetworkData = mocks.getNetworkData;
	},
	NoDataFound: class NoDataFound extends Error {}
}));

import { GET } from './+server.js';

/** @param {string} search @param {ReturnType<typeof vi.fn>} [setHeaders] */
function request(search, setHeaders = vi.fn()) {
	return GET(
		/** @type {any} */ ({
			url: new URL(`https://example.test/api/network/data?${search}`),
			setHeaders
		})
	);
}

describe('network data endpoint', () => {
	beforeEach(() => {
		mocks.getMarket.mockReset().mockResolvedValue({ response: { data: [] } });
		mocks.getNetworkData.mockReset().mockResolvedValue({ response: { data: [] } });
	});

	it('rejects unknown query values and over-wide fine-grained ranges', async () => {
		expect((await request('region=unknown')).status).toBe(400);
		expect((await request('region=nsw1&metric=unknown')).status).toBe(400);
		expect(
			(
				await request(
					'region=nsw1&metric=power&interval=5m&date_start=2026-01-01&date_end=2026-02-01'
				)
			).status
		).toBe(400);
		expect(mocks.getMarket).not.toHaveBeenCalled();
		expect(mocks.getNetworkData).not.toHaveBeenCalled();
	});

	it('routes gross demand through the OE market query', async () => {
		const setHeaders = vi.fn();
		const response = await request(
			'region=nsw1&metric=demand_gross&interval=1h&date_start=2026-01-01&date_end=2026-01-02',
			setHeaders
		);

		expect(response.status).toBe(200);
		expect(mocks.getMarket).toHaveBeenCalledWith('NEM', ['demand_gross'], {
			interval: '1h',
			dateStart: '2026-01-01',
			dateEnd: '2026-01-02',
			network_region: 'NSW1'
		});
		expect(mocks.getNetworkData).not.toHaveBeenCalled();
		expect(setHeaders).toHaveBeenCalledWith({ 'Cache-Control': 'public, max-age=300' });
	});

	it('does not invent a national spot price', async () => {
		const response = await request('region=au&metric=price&interval=1h');
		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ error: 'A national spot price is not available.' });
	});
});
