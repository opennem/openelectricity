import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { client as sanityClient } from '$lib/sanity';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

const SANITY_FACILITY_QUERY = `*[_type == "facility" && code == $code][0]{
	_id, code, name, website, wikipedia, wikidata_id, osm_way_id, npiId, location,
	description, metadata_array,
	network->{_id, code, name},
	region->{_id, code, name},
	owners[]->{_id, name, legal_name, website, contact_email},
	photos,
	units[]->{
		_id, code, dispatch_type, status, capacity_registered, capacity_maximum,
		data_first_seen, data_last_seen, emissions_factor_co2,
		fuel_technology->{_id, code, name, colour, renewable},
		metadata_array
	}
}`;

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
	const code = params.code;

	const DERIVED_BATTERY_FUEL_TECHS = ['battery_charging', 'battery_discharging'];

	/**
	 * Filter out derived battery units only when a bidirectional battery unit exists
	 * @param {any[]} units
	 * @param {(u: any) => string} getFuelTech - accessor for the fuel tech code
	 */
	function filterDerived(units, getFuelTech) {
		const hasBidirectional = units.some((u) => getFuelTech(u) === 'battery');
		if (!hasBidirectional) return units;
		return units.filter((u) => !DERIVED_BATTERY_FUEL_TECHS.includes(getFuelTech(u)));
	}

	// Fetch from OE API and Sanity CMS in parallel
	// Note: client.getFacilities() doesn't support facility_code filtering,
	// so we use client.request() to access the endpoint directly
	const [oeResult, sanityFacility] = await Promise.all([
		client.request(`/facilities/?facility_code=${code}`).then((json) => {
			const facility = json?.data?.[0];
			if (!facility) return null;
			return {
				...facility,
				units: filterDerived(facility.units ?? [], (u) => u.fueltech_id)
			};
		}).catch(() => null),

		sanityClient.fetch(SANITY_FACILITY_QUERY, { code }).then((facility) => {
			if (!facility) return null;
			return {
				...facility,
				units: filterDerived(facility.units ?? [], (u) => u.fuel_technology?.code)
			};
		}).catch(() => null)
	]);

	return {
		facility: oeResult,
		sanityFacility,
		code
	};
}
