/**
 * Social-card preview — lists every facility so the build-generated OG cards
 * (static/og/facility/<code>.jpg) can be eyeballed in one place. Also flags which
 * facilities have a Sanity photo vs fall back to the branded card.
 */

import { OpenElectricityClient } from 'openelectricity';
import { PUBLIC_OE_API_KEY, PUBLIC_OE_API_URL } from '$env/static/public';
import { client as sanityClient } from '$lib/sanity';

const client = new OpenElectricityClient({
	apiKey: PUBLIC_OE_API_KEY,
	baseUrl: PUBLIC_OE_API_URL
});

export async function load() {
	const facilitiesPromise = client
		.getFacilities()
		.then((r) =>
			(r.response.data || [])
				.map((f) => ({ code: f.code, name: f.name || f.code, network_region: f.network_region }))
				.filter((f) => f.code)
				.sort((a, b) => a.name.localeCompare(b.name))
		)
		.catch(() => /** @type {{ code: string, name: string, network_region: string }[]} */ ([]));

	const photoCodesPromise = sanityClient
		.fetch(`*[_type == "facility" && defined(photos[0])].code`)
		.then((/** @type {string[]} */ codes) => codes || [])
		.catch(() => []);

	const [facilities, photoCodes] = await Promise.all([facilitiesPromise, photoCodesPromise]);
	const photoSet = new Set(photoCodes);

	return {
		facilities: facilities.map((f) => ({ ...f, hasPhoto: photoSet.has(f.code) }))
	};
}
