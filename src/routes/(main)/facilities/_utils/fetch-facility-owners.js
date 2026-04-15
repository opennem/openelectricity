import { client as sanityClient } from '$lib/sanity.js';

/**
 * Fetch owner records for a facility by its OE code.
 * Returns an array of `{ _id, name, legal_name, website }` or `[]` if none.
 *
 * @param {string | null} facilityCode
 * @returns {Promise<Array<{ _id: string, name: string, legal_name?: string, website?: string }>>}
 */
export async function fetchFacilityOwners(facilityCode) {
	if (!facilityCode) return [];
	try {
		const result = await sanityClient.fetch(
			`*[_type == "facility" && code == $code][0]{
				owners[]->{_id, name, legal_name, website}
			}`,
			{ code: facilityCode }
		);
		return result?.owners ?? [];
	} catch {
		return [];
	}
}
