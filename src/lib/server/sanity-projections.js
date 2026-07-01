/**
 * Shared Sanity GROQ projections for facility documents.
 *
 * `SANITY_FACILITY_UNITS_PROJECTION` is the unit sub-projection the facility
 * metrics garnishes read (DC:AC ratio, turbine / equipment specs, MLF, storage
 * capacity, emissions factors, closure dates). It's shared by the facility
 * detail page and the facilities map panel so both surface the same enrichment.
 *
 * Unit note: `construction_cost` is stored in millions of AUD (e.g. 150 = $150m).
 */

export const SANITY_FACILITY_UNITS_PROJECTION = `units[]->{
	_id, code, status, dispatch_type,
	capacity_registered, capacity_maximum,
	storage_capacity, min_generation_capacity, grid_forming, marginal_loss_factor,
	emissions_factor_co2, emissions_factor_source,
	commissioning_confirmed,
	commencement_date, commencement_date_specificity,
	expected_operation_date, expected_operation_date_specificity,
	expected_closure_date, expected_closure_date_specificity, expected_closure_date_source,
	closure_date, closure_date_specificity,
	construction_start_date, construction_start_date_specificity, construction_start_date_source,
	construction_cost, construction_cost_source,
	project_approval_date, project_approval_date_source, project_approval_lodgement_date,
	state_approval_date, state_approval_source, state_lodgement_date,
	epbc_id, epbc_number,
	unit_types[]->{
		unit_number, unit_size, capacity, unit_brand, unit_model, unit_model_year,
		unit_model_url, unit_height, unit_weight, mounting_type, unit_efficiency
	}
}`;

/**
 * Full facility profile projection — identity plus the editorial enrichment
 * (description, photos, external links and owners) that the facility detail
 * page and the facilities-list detail preview both render. Shared so the two
 * surfaces stay in sync. Time-sensitive series (power/market/emissions) are
 * fetched separately from the OE API.
 */
export const SANITY_FACILITY_PROFILE_PROJECTION = `{
	_id, code, name, website, wikipedia, wikidata_id, osm_way_id, location,
	description, photos,
	owners[]->{_id, name, legal_name, website},
	${SANITY_FACILITY_UNITS_PROJECTION}
}`;
