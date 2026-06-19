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
