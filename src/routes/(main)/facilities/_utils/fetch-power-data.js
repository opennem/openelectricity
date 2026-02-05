/**
 * Fetch power data for a selected facility
 *
 * @param {import('openelectricity').OpenElectricityClient} client - OpenElectricity API client
 * @param {any[]} facilities - List of facilities (used to resolve network_id)
 * @param {string | null} selectedFacility - Facility code to fetch power data for
 * @returns {Promise<{ powerData: any | null }>}
 */
export async function fetchFacilityPowerData(client, facilities, selectedFacility) {
	if (!selectedFacility) {
		return { powerData: null };
	}

	const facilityData = facilities.find((f) => f.code === selectedFacility);

	if (!facilityData) {
		return { powerData: null };
	}

	try {
		const networkId = /** @type {import('openelectricity').NetworkCode} */ (
			facilityData.network_id
		);
		const { response } = await client.getFacilityData(networkId, selectedFacility, ['power'], {
			interval: '5m'
		});
		return { powerData: response };
	} catch {
		return { powerData: { data: [] } };
	}
}
