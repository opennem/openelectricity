/**
 * AI Context Builder
 *
 * Core helpers for serialising facility data into compact text for LLM prompts.
 * Uses simplified fuel tech groupings so the model can reason about
 * categories like "Battery" or "Gas" rather than individual codes.
 *
 * Two-pass query prompts (QUERY_SCHEMA_DESCRIPTION, buildQuerySystemPrompt,
 * buildAnswerSystemPrompt, etc.) live in ai-prompts.js.
 */

/**
 * Reverse lookup: maps individual fuel tech codes → simplified group label.
 * Built from the same grouping logic as src/lib/fuel-tech-groups/simple.js.
 * @type {Record<string, string>}
 */
const FUEL_TECH_GROUP = {
	battery_charging: 'Battery',
	battery_VPP_charging: 'Battery',
	battery_distributed_charging: 'Battery',
	battery_discharging: 'Battery',
	battery_VPP_discharging: 'Battery',
	battery_distributed_discharging: 'Battery',
	battery: 'Battery',
	pumps: 'Pumps',
	coal_black: 'Coal',
	coal_brown: 'Coal',
	bioenergy: 'Bioenergy',
	bioenergy_biomass: 'Bioenergy',
	bioenergy_biogas: 'Bioenergy',
	distillate: 'Distillate',
	gas_ccgt: 'Gas',
	gas_ccgt_ccs: 'Gas',
	gas_ocgt: 'Gas',
	gas_recip: 'Gas',
	gas_steam: 'Gas',
	gas_wcmg: 'Gas',
	gas_hydrogen: 'Gas',
	hydro: 'Hydro',
	wind: 'Wind',
	wind_offshore: 'Wind',
	solar_utility: 'Solar',
	solar_rooftop: 'Solar',
	solar_thermal: 'Solar',
	nuclear: 'Nuclear',
	imports: 'Imports',
	exports: 'Exports',
	demand_response: 'Demand Response'
};

/**
 * Get the simplified group label for a fuel tech code.
 * @param {string | undefined} code
 * @returns {string}
 */
export function ftGroup(code) {
	return (code && FUEL_TECH_GROUP[code]) || 'Other';
}

/**
 * Determine the primary fuel tech group for a facility based on its units.
 * Uses the group with the most operating capacity, falling back to first unit.
 * @param {any} facility
 * @returns {string}
 */
export function facilityGroup(facility) {
	const units = facility.units || [];
	if (units.length === 0) return 'Unknown';

	/** @type {Record<string, number>} */
	const groupCap = {};
	for (const u of units) {
		const group = ftGroup(u.fuel_technology?.code);
		groupCap[group] = (groupCap[group] || 0) + (u.capacity_registered || 0);
	}

	let bestGroup = ftGroup(units[0]?.fuel_technology?.code);
	let bestCap = 0;
	for (const [group, cap] of Object.entries(groupCap)) {
		if (cap > bestCap) {
			bestGroup = group;
			bestCap = cap;
		}
	}
	return bestGroup;
}

/**
 * Format a number with locale grouping, max 1 decimal.
 * @param {number} n
 * @returns {string}
 */
export function fmt(n) {
	return n.toLocaleString('en-AU', { maximumFractionDigits: 1 });
}

// ---- Legacy single-pass context (fallback) ----

/**
 * Build an aggregated summary of the entire facility dataset.
 * @param {any[]} facilities
 * @returns {string}
 */
export function buildDatasetSummary(facilities) {
	const allUnits = facilities.flatMap((f) => f.units || []);
	const lines = ['=== DATASET SUMMARY ==='];

	// --- Totals ---
	lines.push(`Total facilities: ${facilities.length}`);
	lines.push(`Total units: ${allUnits.length}`);

	// --- Capacity by status ---
	/** @type {Record<string, { count: number, mw: number }>} */
	const byStatus = {};
	for (const u of allUnits) {
		const s = u.status || 'unknown';
		if (!byStatus[s]) byStatus[s] = { count: 0, mw: 0 };
		byStatus[s].count++;
		byStatus[s].mw += u.capacity_registered || 0;
	}
	lines.push('\nCapacity by status:');
	for (const [status, { count, mw }] of Object.entries(byStatus)) {
		lines.push(`  ${status}: ${count} units, ${fmt(mw)} MW`);
	}

	// --- By fuel tech group (global) ---
	/** @type {Record<string, { facilities: number, units: number, operatingMw: number, committedMw: number, renewable: boolean | null }>} */
	const byGroup = {};
	for (const f of facilities) {
		const group = facilityGroup(f);
		if (!byGroup[group]) byGroup[group] = { facilities: 0, units: 0, operatingMw: 0, committedMw: 0, renewable: null };
		byGroup[group].facilities++;
		for (const u of f.units || []) {
			const uGroup = ftGroup(u.fuel_technology?.code);
			if (!byGroup[uGroup]) byGroup[uGroup] = { facilities: 0, units: 0, operatingMw: 0, committedMw: 0, renewable: null };
			byGroup[uGroup].units++;
			if (u.fuel_technology?.renewable != null) byGroup[uGroup].renewable = u.fuel_technology.renewable;
			if (u.status === 'operating') byGroup[uGroup].operatingMw += u.capacity_registered || 0;
			if (u.status === 'committed') byGroup[uGroup].committedMw += u.capacity_registered || 0;
		}
	}
	lines.push('\nBy fuel technology group:');
	for (const [group, data] of Object.entries(byGroup).sort((a, b) => b[1].operatingMw - a[1].operatingMw)) {
		const tag = data.renewable === true ? ' [renewable]' : data.renewable === false ? ' [non-renewable]' : '';
		const parts = [`${data.facilities} facilities, ${data.units} units, ${fmt(data.operatingMw)} MW operating`];
		if (data.committedMw > 0) parts.push(`${fmt(data.committedMw)} MW committed`);
		lines.push(`  ${group}: ${parts.join(', ')}${tag}`);
	}

	// --- Region × fuel tech cross-tabulation (compact) ---
	/** @type {Record<string, Record<string, number>>} */
	const regionFacCount = {};
	for (const f of facilities) {
		const region = f.region?.name || 'Unknown';
		const group = facilityGroup(f);
		if (!regionFacCount[region]) regionFacCount[region] = {};
		regionFacCount[region][group] = (regionFacCount[region][group] || 0) + 1;
	}

	lines.push('\nFacilities by region (count):');
	for (const region of Object.keys(regionFacCount).sort()) {
		const parts = Object.entries(regionFacCount[region])
			.sort((a, b) => b[1] - a[1])
			.map(([g, n]) => `${g}=${n}`);
		lines.push(`  ${region}: ${parts.join(' ')}`);
	}

	// --- Top owners ---
	/** @type {Record<string, number>} */
	const ownerCap = {};
	for (const f of facilities) {
		const cap = (f.units || [])
			.filter((/** @type {any} */ u) => u.status === 'operating')
			.reduce((/** @type {number} */ s, /** @type {any} */ u) => s + (u.capacity_registered || 0), 0);
		for (const owner of f.owners || []) {
			const name = owner.name || owner.legal_name || 'Unknown';
			ownerCap[name] = (ownerCap[name] || 0) + cap;
		}
	}
	const topOwners = Object.entries(ownerCap)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 10);
	if (topOwners.length > 0) {
		lines.push('\nTop owners (operating MW):');
		for (const [name, mw] of topOwners) {
			lines.push(`  ${name}: ${fmt(mw)}`);
		}
	}

	// --- Data completeness ---
	const withPhotos = facilities.filter((f) => f.photos?.length > 0).length;
	const withLocation = facilities.filter((f) => f.location?.lat && f.location?.lng).length;
	const withDescription = facilities.filter((f) => f.description?.length > 0).length;
	lines.push('\nData completeness:');
	lines.push(`  With photos: ${withPhotos}/${facilities.length}`);
	lines.push(`  With location: ${withLocation}/${facilities.length}`);
	lines.push(`  With description: ${withDescription}/${facilities.length}`);

	// --- Compact facility listing ---
	lines.push('\n=== ALL FACILITIES ===');
	lines.push('Name | Region | Type | MW');
	for (const f of facilities) {
		const region = f.region?.name || '—';
		const group = facilityGroup(f);
		const totalMw = (f.units || []).reduce(
			(/** @type {number} */ s, /** @type {any} */ u) => s + (u.capacity_registered || 0),
			0
		);
		lines.push(`${f.name || '—'} | ${region} | ${group} | ${fmt(totalMw)}`);
	}

	return lines.join('\n');
}

/**
 * Serialise a single facility + all its units into dense key-value text.
 * Includes every available field — omits only null/empty values.
 * @param {any} facility
 * @returns {string}
 */
export function buildFacilityDetail(facility) {
	if (!facility) return '';

	const lines = ['=== FACILITY ==='];

	/** @param {string} key @param {any} value */
	function kv(key, value) {
		if (value != null && value !== '' && value !== false) {
			lines.push(`${key}: ${value}`);
		}
	}

	// Core identity
	kv('Name', facility.name);
	kv('Code', facility.code);
	kv('Network', facility.network?.name);
	kv('Region', facility.region?.name);
	if (facility.location?.lat && facility.location?.lng) {
		kv('Location', `${facility.location.lat}, ${facility.location.lng}`);
	}
	kv('Website', facility.website);
	kv('Wikipedia', facility.wikipedia);

	// External identifiers
	kv('Wikidata ID', facility.wikidata_id);
	kv('OSM Way ID', facility.osm_way_id);
	kv('NPI ID', facility.npiId);

	// Description as plain text
	if (facility.description?.length > 0) {
		const text = facility.description
			.filter((/** @type {any} */ b) => b._type === 'block')
			.map((/** @type {any} */ b) => b.children?.map((/** @type {any} */ c) => c.text).join('') || '')
			.join(' ');
		if (text.trim()) kv('Description', text.trim());
	}

	// Owners — full detail
	if (facility.owners?.length > 0) {
		lines.push(`\nOwners (${facility.owners.length}):`);
		for (const owner of facility.owners) {
			const name = owner.name || owner.legal_name || 'Unknown';
			lines.push(`  ${name}`);
			if (owner.legal_name && owner.legal_name !== owner.name) kv('    Legal name', owner.legal_name);
			kv('    Website', owner.website);
			kv('    Wikipedia', owner.wikipedia);
			kv('    Email', owner.contact_email);
			kv('    Phone', owner.contact_phone);
			kv('    Address', owner.address);
		}
	}

	// Units — comprehensive detail
	if (facility.units?.length > 0) {
		const totalCap = facility.units.reduce(
			(/** @type {number} */ s, /** @type {any} */ u) => s + (u.capacity_registered || 0),
			0
		);
		lines.push(`\nUnits (${facility.units.length}, total ${fmt(totalCap)} MW):`);

		for (const unit of facility.units) {
			// Header line
			const parts = [`  ${unit.code || '—'}`];
			if (unit.fuel_technology?.name) parts.push(unit.fuel_technology.name);
			if (unit.status) parts.push(unit.status);
			if (unit.capacity_registered != null) parts.push(`${unit.capacity_registered} MW`);
			if (unit.dispatch_type) parts.push(unit.dispatch_type);
			lines.push(parts.join(' | '));

			// Capacity & technical specs
			const specs = [];
			if (unit.capacity_maximum != null) specs.push(`max_cap=${unit.capacity_maximum}MW`);
			if (unit.min_generation_capacity != null) specs.push(`min_gen=${unit.min_generation_capacity}MW`);
			if (unit.storage_capacity != null) specs.push(`storage=${unit.storage_capacity}MWh`);
			if (unit.grid_forming != null) specs.push(`grid_forming=${unit.grid_forming}`);
			if (unit.marginal_loss_factor != null) specs.push(`mlf=${unit.marginal_loss_factor}`);
			if (specs.length > 0) lines.push(`    ${specs.join(', ')}`);

			// Emissions
			const emissions = [];
			if (unit.emissions_factor_co2 != null) emissions.push(`co2=${unit.emissions_factor_co2}`);
			if (unit.emissions_factor_source) emissions.push(`source=${unit.emissions_factor_source}`);
			if (emissions.length > 0) lines.push(`    ${emissions.join(', ')}`);

			// Dates
			const dates = [];
			if (unit.commencement_date) {
				let d = `commenced=${unit.commencement_date}`;
				if (unit.commencement_date_specificity) d += ` (${unit.commencement_date_specificity})`;
				dates.push(d);
			}
			if (unit.construction_start_date) dates.push(`construction_start=${unit.construction_start_date}`);
			if (unit.expected_operation_date) {
				let d = `expected_operation=${unit.expected_operation_date}`;
				if (unit.expected_operation_date_specificity) d += ` (${unit.expected_operation_date_specificity})`;
				dates.push(d);
			}
			if (unit.commissioning_confirmed != null) dates.push(`commissioning_confirmed=${unit.commissioning_confirmed}`);
			if (unit.expected_closure_date) {
				let d = `expected_closure=${unit.expected_closure_date}`;
				if (unit.expected_closure_date_specificity) d += ` (${unit.expected_closure_date_specificity})`;
				dates.push(d);
			}
			if (unit.closure_date) {
				let d = `closed=${unit.closure_date}`;
				if (unit.closure_date_specificity) d += ` (${unit.closure_date_specificity})`;
				dates.push(d);
			}
			if (unit.data_first_seen) dates.push(`first_seen=${unit.data_first_seen}`);
			if (unit.data_last_seen) dates.push(`last_seen=${unit.data_last_seen}`);
			if (dates.length > 0) lines.push(`    ${dates.join(', ')}`);

			// Cost
			if (unit.construction_cost) lines.push(`    construction_cost=${unit.construction_cost}`);
			if (unit.cis_tender_recipient != null) lines.push(`    cis_tender_recipient=${unit.cis_tender_recipient}`);

			// Fuel technology detail
			if (unit.fuel_technology?.renewable != null) lines.push(`    renewable=${unit.fuel_technology.renewable}`);

			// Unit types — full equipment detail
			if (unit.unit_types?.length > 0) {
				for (const ut of unit.unit_types) {
					const utParts = [];
					if (ut.unit_brand) utParts.push(ut.unit_brand);
					if (ut.unit_model) utParts.push(ut.unit_model);
					if (ut.capacity != null) utParts.push(`${ut.capacity}MW`);
					if (ut.unit_size != null) utParts.push(`size=${ut.unit_size}`);
					if (ut.unit_model_year) utParts.push(`year=${ut.unit_model_year}`);
					if (ut.mounting_type) utParts.push(`mounting=${ut.mounting_type}`);
					if (ut.unit_efficiency != null) utParts.push(`efficiency=${ut.unit_efficiency}%`);
					if (ut.unit_height != null) utParts.push(`height=${ut.unit_height}m`);
					if (ut.unit_weight != null) utParts.push(`weight=${ut.unit_weight}t`);
					if (utParts.length > 0) lines.push(`    equipment: ${utParts.join(', ')}`);
					if (ut.unit_model_url) lines.push(`    model_url: ${ut.unit_model_url}`);
				}
			}

			// Unit-level metadata
			if (unit.metadata_array?.length > 0) {
				for (const meta of unit.metadata_array) {
					kv(`    ${meta.key}`, meta.value);
				}
			}
		}
	}

	// Facility-level metadata
	if (facility.metadata_array?.length > 0) {
		lines.push('\nMetadata:');
		for (const meta of facility.metadata_array) {
			kv(`  ${meta.key}`, meta.value);
		}
	}

	return lines.join('\n');
}

/**
 * Build the full context string for a chat message (legacy single-pass).
 * Combines dataset summary with optional selected facility detail.
 * @param {any[]} facilities
 * @param {any} selectedFacility
 * @returns {string}
 */
export function buildChatContext(facilities, selectedFacility) {
	const parts = [buildDatasetSummary(facilities)];
	if (selectedFacility) {
		parts.push(buildFacilityDetail(selectedFacility));
	}
	return parts.join('\n\n');
}
