/**
 * Fetch power data for a selected facility
 *
 * @param {import('openelectricity').OpenElectricityClient} client - OpenElectricity API client
 * @param {any[]} facilities - List of facilities to search
 * @param {string | null} selectedFacility - Facility code to fetch power data for
 * @returns {Promise<{ powerData: any | null, selectedFacilityData: any | null }>}
 */
export async function fetchFacilityPowerData(client, facilities, selectedFacility) {
	if (!selectedFacility) {
		return { powerData: null, selectedFacilityData: null };
	}

	const selectedFacilityData = facilities.find((f) => f.code === selectedFacility) ?? null;

	if (!selectedFacilityData) {
		return { powerData: null, selectedFacilityData: null };
	}

	try {
		const networkId = /** @type {import('openelectricity').NetworkCode} */ (
			selectedFacilityData.network_id
		);
		const { response } = await client.getFacilityData(networkId, selectedFacility, ['power'], {
			interval: '5m'
		});
		return { powerData: response, selectedFacilityData };
	} catch {
		// Return empty data to indicate "no data" vs null for "loading"
		return { powerData: { data: [] }, selectedFacilityData };
	}
}
