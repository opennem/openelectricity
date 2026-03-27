import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchFacilityPowerData } from './fetch-power-data.js';

/**
 * Create a mock OE client with getFacilityData method.
 * @param {Object} overrides
 * @returns {any}
 */
function createMockClient(overrides = {}) {
	return {
		getFacilityData: vi.fn().mockResolvedValue({ response: { data: [] } }),
		...overrides
	};
}

const facilities = [
	{ code: 'BAYSW', network_id: 'NEM' },
	{ code: 'COLLIE', network_id: 'WEM' }
];

describe('fetchFacilityPowerData', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns null when no selectedFacility', async () => {
		const client = createMockClient();
		const result = await fetchFacilityPowerData(client, facilities, null);

		expect(result).toBeNull();
		expect(client.getFacilityData).not.toHaveBeenCalled();
	});

	it('returns null when facility not found in list', async () => {
		const client = createMockClient();
		const result = await fetchFacilityPowerData(client, facilities, 'UNKNOWN');

		expect(result).toBeNull();
		expect(client.getFacilityData).not.toHaveBeenCalled();
	});

	it('fetches power+market_value data when facility found', async () => {
		const powerResponse = { data: [{ metric: 'power' }] };

		const client = createMockClient({
			getFacilityData: vi.fn().mockResolvedValue({ response: powerResponse })
		});

		const result = await fetchFacilityPowerData(client, facilities, 'BAYSW');

		expect(result).toEqual(powerResponse);

		expect(client.getFacilityData).toHaveBeenCalledTimes(1);
		expect(client.getFacilityData).toHaveBeenCalledWith(
			'NEM',
			'BAYSW',
			['power', 'market_value'],
			{ interval: '5m' }
		);
	});

	it('uses correct network_id for WEM facilities', async () => {
		const client = createMockClient({
			getFacilityData: vi.fn().mockResolvedValue({ response: { data: [] } })
		});

		await fetchFacilityPowerData(client, facilities, 'COLLIE');

		expect(client.getFacilityData).toHaveBeenCalledWith(
			'WEM',
			'COLLIE',
			['power', 'market_value'],
			{ interval: '5m' }
		);
	});

	it('returns fallback data on API error', async () => {
		const client = createMockClient({
			getFacilityData: vi.fn().mockRejectedValue(new Error('API timeout'))
		});

		const result = await fetchFacilityPowerData(client, facilities, 'BAYSW');

		expect(result).toEqual({ data: [] });
	});
});
