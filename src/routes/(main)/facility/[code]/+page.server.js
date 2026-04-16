import { error } from '@sveltejs/kit';
import { client as sanityClient } from '$lib/sanity';
import { fetchFacilityByCode } from '$lib/server/opennem/fetch-facility-by-code.js';

const DEFAULT_RANGE_DAYS = 7;

/**
 * @param {Object} params
 * @param {{ code: string }} params.params
 * @param {typeof fetch} params.fetch
 */
export async function load({ params, fetch }) {
	const { code } = params;

	const facilityPromise = fetchFacilityByCode(code);

	const sanityPromise = sanityClient
		.fetch(
			`*[_type == "facility" && code == $code][0]{
				_id, code, name, website, wikipedia,
				description, photos,
				owners[]->{_id, name, legal_name, website}
			}`,
			{ code }
		)
		.catch(() => null);

	const facility = await facilityPromise;
	if (!facility) throw error(404, `Facility "${code}" not found`);

	const timeZone = facility.network_id === 'WEM' ? '+08:00' : '+10:00';

	const powerParams = new URLSearchParams({
		network_id: facility.network_id,
		days: String(DEFAULT_RANGE_DAYS)
	});
	const powerPromise = fetch(`/api/facilities/${code}/power?${powerParams.toString()}`)
		.then(async (res) => (res.ok ? (await res.json()).response : null))
		.catch(() => null);

	const [sanityFacility, powerData] = await Promise.all([sanityPromise, powerPromise]);

	return {
		facility,
		sanityFacility,
		powerData,
		timeZone,
		rangeDays: DEFAULT_RANGE_DAYS
	};
}
