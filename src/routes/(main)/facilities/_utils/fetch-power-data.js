/**
 * Fetch power data (with market value) for a selected facility.
 *
 * @param {import('openelectricity').OpenElectricityClient} client - OpenElectricity API client
 * @param {any[]} facilities - List of facilities (used to resolve network_id)
 * @param {string | null} selectedFacility - Facility code to fetch power data for
 * @returns {Promise<any | null>}
 */
export async function fetchFacilityPowerData(client, facilities, selectedFacility) {
	if (!selectedFacility) {
		return null;
	}

	const facilityData = facilities.find((f) => f.code === selectedFacility);

	if (!facilityData) {
		return null;
	}

	const networkId = /** @type {import('openelectricity').NetworkCode} */ (
		facilityData.network_id
	);

	try {
		const { response } = await client.getFacilityData(
			networkId,
			selectedFacility,
			['power', 'market_value'],
			{ interval: '5m' }
		);

		return response;
	} catch {
		return { data: [] };
	}
}
