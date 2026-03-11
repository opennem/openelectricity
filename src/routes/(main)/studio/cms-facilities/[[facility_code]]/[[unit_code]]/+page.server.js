import { createCmsClient, getAvailableDatasets, resolveDataset } from '$lib/sanity-cms.js';

const FACILITIES_QUERY = `*[_type == "facility"] | order(name asc) {
	_id, code, name, website, wikipedia, wikidata_id, osm_way_id, npiId, location,
	description, metadata_array,
	network->{_id, code, name},
	region->{_id, code, name},
	owners[]->{_id, name, legal_name, website, wikipedia, contact_email, contact_phone, address},
	photos,
	units[]->{
		_id, code, dispatch_type, status, capacity_registered, capacity_maximum,
		storage_capacity, min_generation_capacity, grid_forming, marginal_loss_factor,
		emissions_factor_co2, emissions_factor_source,
		data_first_seen, data_last_seen,
		commissioning_confirmed, expected_operation_date, expected_operation_date_specificity,
		expected_closure_date, expected_closure_date_specificity,
		commencement_date, commencement_date_specificity,
		closure_date, closure_date_specificity,
		construction_start_date, construction_cost,
		cis_tender_recipient,
		fuel_technology->{_id, code, name, colour, renewable, dispatch_type},
		unit_types[]->{_id, unit_number, unit_size, capacity, unit_brand, unit_model, unit_model_year, unit_model_url, unit_height, unit_weight, mounting_type, unit_efficiency},
		metadata_array
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
