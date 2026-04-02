import { createCmsClient, getAvailableDatasets, resolveDataset } from '$lib/sanity-cms.js';

const FACILITIES_QUERY = `*[_type == "facility"] | order(name asc) {
	_id, code, name, website, wikipedia, wikidata_id, osm_way_id, npiId, location,
	description, metadata_array,
	network->{_id, code, name},
	region->{_id, code, name},
	owners[]->{_id, name, legal_name, website, wikipedia, contact_email, contact_phone, address},
	photos,
	units[]->{
		...,
		fuel_technology->{_id, code, name, colour, renewable, dispatch_type},
		unit_types[]->{_id, unit_number, unit_size, capacity, unit_brand, unit_model, unit_model_year, unit_model_url, unit_height, unit_weight, mounting_type, unit_efficiency}
	}
}`;

/** @type {import('./$types').PageServerLoad} */
export async function load({ cookies }) {
	const dataset = await resolveDataset(cookies);
	const client = createCmsClient(dataset);
	const facilities = await client.fetch(FACILITIES_QUERY);

	return {
		facilities: facilities ?? [],
		sanity: {
			projectId: client.config().projectId,
			dataset,
			availableDatasets: await getAvailableDatasets()
		}
	};
}
