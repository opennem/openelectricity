import { json } from '@sveltejs/kit';
import { client as sanityClient } from '$lib/sanity.js';
import { SANITY_FACILITY_PROFILE_PROJECTION } from '$lib/server/sanity-projections.js';

/**
 * Facility profile endpoint — returns the Sanity editorial enrichment
 * (description, photos, external links, owners and unit garnishes) for a single
 * facility code. Fetched client-side when a facility is selected on the
 * /facilities page so opening the detail preview never blocks on a full page
 * load. Returns `null` (200) when the facility has no Sanity document so the
 * panel degrades gracefully to the OE-only data it already holds.
 *
 * @param {Object} args
 * @param {{ code: string }} args.params
 * @param {(headers: Record<string, string>) => void} args.setHeaders
 */
export async function GET({ params, setHeaders }) {
	const { code } = params;

	let profile = null;
	try {
		profile = await sanityClient.fetch(
			`*[_type == "facility" && code == $code][0]${SANITY_FACILITY_PROFILE_PROJECTION}`,
			{ code }
		);
	} catch {
		// Sanity unreachable — fall through with null so the panel still renders.
		profile = null;
	}

	// Profiles change rarely; cache at the edge and let the browser reuse it so
	// re-selecting a facility is instant.
	setHeaders({ 'cache-control': 'public, max-age=3600' });

	return json(profile);
}
