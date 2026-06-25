/**
 * Shared Sanity GROQ projections for facility documents.
 *
 * `SANITY_FACILITY_UNITS_PROJECTION` is the unit sub-projection the facility
 * metrics garnishes read (DC:AC ratio, turbine / equipment specs, MLF, storage
 * capacity, emissions factors, closure dates). It's shared by the facility
 * detail page and the facilities map panel so both surface the same enrichment.
 */

export const SANITY_FACILITY_UNITS_PROJECTION = `units[]->{
	_id, code, dispatch_type, capacity_registered, capacity_maximum,
	storage_capacity, min_generation_capacity, marginal_loss_factor,
	emissions_factor_co2,
	commencement_date, commencement_date_specificity,
	expected_closure_date, expected_closure_date_specificity,
	unit_types[]->{
		unit_number, unit_size, capacity, unit_brand, unit_model, unit_height
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
	_id, code, name, website, wikipedia, wikidata_id, location,
	description, photos,
	owners[]->{_id, name, legal_name, website},
	${SANITY_FACILITY_UNITS_PROJECTION}
}`;
