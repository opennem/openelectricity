/**
 * AI Two-Pass Query Prompts
 *
 * System prompts and serialisation for the two-pass query system:
 *   Pass 1: Generate a structured JSON query from the user's question
 *   Pass 2: Answer using the query results as context
 *
 * Core context helpers (ftGroup, facilityGroup, buildFacilityDetail, etc.)
 * live in ai-context.js and are imported here.
 */

import { facilityGroup, buildFacilityDetail, fmt } from './ai-context.js';

/**
 * Static schema description for Pass 1 — tells the LLM what query operations
 * are available and what the dataset looks like.
 */
export const QUERY_SCHEMA_DESCRIPTION = `You are a query generator for an Australian electricity facility dataset.

Given a user question, output a JSON query object that will be executed client-side against the dataset. Output ONLY valid JSON — no markdown fences, no explanation.

## Dataset schema

Each facility has:
- name (string): Facility name
- code (string): Unique identifier
- region.name (string): One of "New South Wales", "Queensland", "Victoria", "South Australia", "Tasmania", "Western Australia"
- network.name (string): "NEM" or "WEM"
- location.lat, location.lng (number): Coordinates
- website, wikipedia (string): URLs
- description (portable text blocks)
- owners[].name (string): Owner companies
- units[]: Array of generating units, each with:
  - code (string): Unit identifier
  - status (string): "operating", "committed", "commissioning", "retired", "mothballed"
  - capacity_registered (number): MW capacity
  - capacity_maximum (number): Max MW
  - storage_capacity (number): MWh (batteries)
  - dispatch_type (string): "GENERATOR" or "LOAD"
  - fuel_technology.code (string): e.g. "solar_utility", "coal_black", "battery_discharging"
  - fuel_technology.name (string): Human-readable name
  - fuel_technology.renewable (boolean)
  - emissions_factor_co2 (number)
  - expected_closure_date (string): ISO date
  - closure_date (string): ISO date
  - commencement_date (string): ISO date
  - data_first_seen, data_last_seen (string): ISO dates
  - unit_types[]: Array of { unit_brand, unit_model, capacity, unit_size }

Fuel tech groups (simplified): Battery, Pumps, Coal, Bioenergy, Distillate, Gas, Hydro, Wind, Solar, Nuclear, Demand Response

## Query object format

{
  "filter": {
    "region": "New South Wales",           // exact match on region.name
    "fuelTechGroup": "Coal",               // simplified group (see list above)
    "fuelTechCode": "coal_black",          // exact fuel_technology.code
    "status": "operating",                 // unit status filter
    "renewable": true,                     // filter by renewable flag
    "networkName": "NEM",                  // network filter
    "ownerName": "AGL",                    // substring match on any owner name
    "capacityMin": 100,                    // total facility capacity >= MW
    "capacityMax": 500,                    // total facility capacity <= MW
    "expectedClosureBefore": "2030-01-01", // any unit with expected_closure_date before this
    "expectedClosureAfter": "2025-01-01",  // any unit with expected_closure_date after this
    "commencedBefore": "2020-01-01",       // any unit with commencement_date before this
    "commencedAfter": "2010-01-01",        // any unit with commencement_date after this
    "hasStorage": true                     // has units with storage_capacity > 0
  },
  "search": "Hornsdale",                  // fuzzy name search (substring, case-insensitive)
  "sort": { "field": "totalCapacity", "order": "desc" },        // sort field + direction
  "limit": 20,                                                   // max results (default 20)
  "aggregate": {
    "op": "sum",          // "sum", "count", "avg", "min", "max"
    "field": "operatingCapacity",  // "operatingCapacity", "totalCapacity", "facilities", "units", "storageCapacity"
    "groupBy": "region"   // "region", "fuelTechGroup", "status", "owner", "network"
  }
}

## Rules

1. Only include filter keys that are relevant to the question — omit unused keys
2. For questions about specific facilities, use "search" with the name
3. For aggregation questions ("how many", "total capacity"), use "aggregate"
4. For listing/ranking questions, use sort + limit
5. If the question is NOT about facility data (e.g. weather, general knowledge), return: { "passthrough": true }
6. If a facility is currently selected and the question is clearly about it, return: { "passthrough": true }
7. Combine filter + aggregate for questions like "total solar capacity in NSW"
8. Use "count" op with "facilities" field for "how many" questions`;

/**
 * Build compact dataset stats for Pass 1 (no per-facility listing).
 * @param {any[]} facilities
 * @returns {string}
 */
export function buildDatasetStats(facilities) {
	const allUnits = facilities.flatMap((f) => f.units || []);
	const lines = ['Dataset: Australian electricity facilities'];
	lines.push(`${facilities.length} facilities, ${allUnits.length} units`);

	// Regions
	/** @type {Record<string, number>} */
	const regionCount = {};
	for (const f of facilities) {
		const r = f.region?.name || 'Unknown';
		regionCount[r] = (regionCount[r] || 0) + 1;
	}
	lines.push(`Regions: ${Object.entries(regionCount).map(([r, n]) => `${r}(${n})`).join(', ')}`);

	// Fuel tech groups
	/** @type {Record<string, number>} */
	const groupCount = {};
	for (const f of facilities) {
		const g = facilityGroup(f);
		groupCount[g] = (groupCount[g] || 0) + 1;
	}
	lines.push(`Types: ${Object.entries(groupCount).sort((a, b) => b[1] - a[1]).map(([g, n]) => `${g}(${n})`).join(', ')}`);

	// Statuses
	/** @type {Record<string, number>} */
	const statusCount = {};
	for (const u of allUnits) {
		const s = u.status || 'unknown';
		statusCount[s] = (statusCount[s] || 0) + 1;
	}
	lines.push(`Statuses: ${Object.entries(statusCount).map(([s, n]) => `${s}(${n})`).join(', ')}`);

	return lines.join('\n');
}

/**
 * Build the system prompt for Pass 1 (query generation).
 * @param {any[]} facilities
 * @param {any} selectedFacility
 * @returns {string}
 */
export function buildQuerySystemPrompt(facilities, selectedFacility) {
	const parts = [QUERY_SCHEMA_DESCRIPTION, '\n## Current dataset\n', buildDatasetStats(facilities)];
	if (selectedFacility) {
		parts.push(`\nCurrently selected facility: "${selectedFacility.name}" (${selectedFacility.code}) in ${selectedFacility.region?.name}`);
	}
	return parts.join('\n');
}

/**
 * Describe the applied filters as a human-readable string.
 * @param {Record<string, any> | null | undefined} filter
 * @param {string | null | undefined} search
 * @returns {string}
 */
export function describeFilters(filter, search) {
	const parts = [];
	if (search) parts.push(`search="${search}"`);
	if (!filter) return parts.join(', ');

	if (filter.region) parts.push(`region: ${filter.region}`);
	if (filter.fuelTechGroup) parts.push(`fuel tech group: ${filter.fuelTechGroup}`);
	if (filter.fuelTechCode) parts.push(`fuel tech code: ${filter.fuelTechCode}`);
	if (filter.status) parts.push(`status: ${filter.status}`);
	if (filter.renewable != null) parts.push(`renewable: ${filter.renewable}`);
	if (filter.networkName) parts.push(`network: ${filter.networkName}`);
	if (filter.ownerName) parts.push(`owner contains "${filter.ownerName}"`);
	if (filter.capacityMin != null) parts.push(`capacity >= ${filter.capacityMin} MW`);
	if (filter.capacityMax != null) parts.push(`capacity <= ${filter.capacityMax} MW`);
	if (filter.expectedClosureBefore) parts.push(`expected closure before ${filter.expectedClosureBefore}`);
	if (filter.expectedClosureAfter) parts.push(`expected closure after ${filter.expectedClosureAfter}`);
	if (filter.commencedBefore) parts.push(`commenced before ${filter.commencedBefore}`);
	if (filter.commencedAfter) parts.push(`commenced after ${filter.commencedAfter}`);
	if (filter.hasStorage) parts.push('has storage');

	return parts.join(', ');
}

/**
 * Serialise query results into compact text for Pass 2.
 * @param {{ type: string, data: any[], meta?: any }} results
 * @returns {string}
 */
export function serializeQueryResults(results) {
	const lines = [];

	if (results.type === 'aggregate') {
		lines.push('=== QUERY RESULTS (AGGREGATION) ===');

		const filterDesc = describeFilters(results.meta?.filter, results.meta?.search);
		if (filterDesc) lines.push(`Filters applied: ${filterDesc}`);

		if (results.meta?.description) lines.push(results.meta.description);
		lines.push(`Total matching facilities: ${results.meta?.totalMatched ?? '?'}`);

		for (const row of results.data) {
			const parts = [];
			for (const [key, value] of Object.entries(row)) {
				if (typeof value === 'number') {
					parts.push(`${key}: ${fmt(value)}`);
				} else {
					parts.push(`${key}: ${value}`);
				}
			}
			lines.push(parts.join(' | '));
		}
		return lines.join('\n');
	}

	// List results — always full detail per facility
	lines.push(`=== QUERY RESULTS (${results.data.length} facilities) ===`);
	const listFilterDesc = describeFilters(results.meta?.filter, results.meta?.search);
	if (listFilterDesc) lines.push(`Filters applied: ${listFilterDesc}`);
	if (results.meta?.totalMatched && results.meta.totalMatched > results.data.length) {
		lines.push(`Showing ${results.data.length} of ${results.meta.totalMatched} matches`);
	}

	for (const f of results.data) {
		lines.push(buildFacilityDetail(f._raw || f));
	}

	return lines.join('\n');
}

/**
 * Build the system prompt for Pass 2 (answer generation).
 * @param {{ type: string, data: any[], meta?: any }} results
 * @param {any} selectedFacility
 * @returns {string}
 */
export function buildAnswerSystemPrompt(results, selectedFacility) {
	const parts = [
		`You are an expert analyst for Australia's electricity grid. Answer the user's question thoroughly using the query results below. Include specific numbers, dates, and details from the data. Use tables or lists when comparing items. Mention individual facility names and unit-level detail where relevant. If the data doesn't fully answer the question, say what's available.`,
		'',
		serializeQueryResults(results)
	];
	if (selectedFacility) {
		parts.push('', buildFacilityDetail(selectedFacility));
	}
	return parts.join('\n');
}
