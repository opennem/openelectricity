/**
 * AI Query Engine
 *
 * Executes structured queries against the in-memory facilities array.
 * Used by the two-pass AI chat system: Pass 1 generates a query object,
 * this module executes it, and Pass 2 answers with the results.
 */

import { facilityGroup } from './ai-context.js';

/**
 * @typedef {{
 *   filter?: {
 *     region?: string,
 *     fuelTechGroup?: string,
 *     fuelTechCode?: string,
 *     status?: string,
 *     renewable?: boolean,
 *     networkName?: string,
 *     ownerName?: string,
 *     capacityMin?: number,
 *     capacityMax?: number,
 *     expectedClosureBefore?: string,
 *     expectedClosureAfter?: string,
 *     commencedBefore?: string,
 *     commencedAfter?: string,
 *     hasStorage?: boolean
 *   },
 *   search?: string,
 *   sort?: { field: string, order?: 'asc' | 'desc' },
 *   limit?: number,
 *   aggregate?: {
 *     op: 'sum' | 'count' | 'avg' | 'min' | 'max',
 *     field: string,
 *     groupBy?: string
 *   },
 *   passthrough?: boolean
 * }} FacilityQuery
 *
 * @typedef {{ type: 'list' | 'aggregate' | 'passthrough', data: any[], meta?: any }} QueryResult
 */

/**
 * Parse the LLM's response text into a query object.
 * Handles markdown fences, surrounding text, and malformed JSON gracefully.
 * @param {string} content
 * @returns {FacilityQuery | null}
 */
export function parseQueryResponse(content) {
	if (!content || typeof content !== 'string') return null;

	let text = content.trim();

	// Strip markdown code fences
	const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
	if (fenceMatch) {
		text = fenceMatch[1].trim();
	}

	// Try to find a JSON object in the text
	const firstBrace = text.indexOf('{');
	const lastBrace = text.lastIndexOf('}');
	if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;

	text = text.slice(firstBrace, lastBrace + 1);

	try {
		const parsed = JSON.parse(text);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
}

/**
 * Execute a query against the facilities array.
 * @param {any[]} facilities
 * @param {FacilityQuery} query
 * @returns {QueryResult}
 */
export function executeQuery(facilities, query) {
	if (query.passthrough) {
		return { type: 'passthrough', data: [] };
	}

	// Enrich all facilities with computed fields
	let enriched = facilities.map(enrichFacility);

	// Apply search filter
	if (query.search) {
		enriched = searchFacilities(enriched, query.search);
	}

	// Apply structured filters
	if (query.filter) {
		enriched = applyFilters(enriched, query.filter);
	}

	// Aggregation path
	if (query.aggregate) {
		const result = aggregate(enriched, query.aggregate);
		return {
			type: 'aggregate',
			data: result.rows,
			meta: {
				description: result.description,
				totalMatched: enriched.length,
				filter: query.filter || null,
				search: query.search || null
			}
		};
	}

	const totalMatched = enriched.length;

	// Sort
	if (query.sort) {
		enriched = sortFacilities(enriched, query.sort);
	}

	// Limit
	const limit = query.limit || 20;
	enriched = enriched.slice(0, limit);

	// Always return raw facility objects — the two-pass system has already
	// narrowed to relevant facilities, so serialisation can include everything.
	const data = enriched.map((f) => ({ _raw: f }));

	return {
		type: 'list',
		data,
		meta: {
			totalMatched,
			filter: query.filter || null,
			search: query.search || null
		}
	};
}

/**
 * Add computed fields to a facility for easier querying.
 * @param {any} facility
 * @returns {any}
 */
function enrichFacility(facility) {
	const units = facility.units || [];
	const group = facilityGroup(facility);

	const totalCapacity = units.reduce(
		(/** @type {number} */ s, /** @type {any} */ u) => s + (u.capacity_registered || 0),
		0
	);
	const operatingCapacity = units
		.filter((/** @type {any} */ u) => u.status === 'operating')
		.reduce((/** @type {number} */ s, /** @type {any} */ u) => s + (u.capacity_registered || 0), 0);
	const storageCapacity = units.reduce(
		(/** @type {number} */ s, /** @type {any} */ u) => s + (u.storage_capacity || 0),
		0
	);

	const ownerNames = (facility.owners || [])
		.map((/** @type {any} */ o) => o.name || o.legal_name || '')
		.filter(Boolean);

	return {
		...facility,
		_fuelTechGroup: group,
		_totalCapacity: totalCapacity,
		_operatingCapacity: operatingCapacity,
		_storageCapacity: storageCapacity,
		_ownerNames: ownerNames,
		_unitCount: units.length,
		_renewable: units.some((/** @type {any} */ u) => u.fuel_technology?.renewable === true)
	};
}

/**
 * Fuzzy name search — case-insensitive substring match.
 * @param {any[]} facilities
 * @param {string} term
 * @returns {any[]}
 */
function searchFacilities(facilities, term) {
	const lower = term.toLowerCase();
	return facilities.filter((f) => {
		const name = (f.name || '').toLowerCase();
		const code = (f.code || '').toLowerCase();
		return name.includes(lower) || code.includes(lower);
	});
}

/**
 * Apply structured filter object to facilities.
 * @param {any[]} facilities
 * @param {NonNullable<FacilityQuery['filter']>} filter
 * @returns {any[]}
 */
function applyFilters(facilities, filter) {
	return facilities.filter((f) => {
		if (filter.region) {
			const region = f.region?.name || '';
			if (region.toLowerCase() !== filter.region.toLowerCase()) return false;
		}

		if (filter.fuelTechGroup) {
			if (f._fuelTechGroup.toLowerCase() !== filter.fuelTechGroup.toLowerCase()) return false;
		}

		if (filter.fuelTechCode) {
			const units = f.units || [];
			if (!units.some((/** @type {any} */ u) => u.fuel_technology?.code === filter.fuelTechCode)) return false;
		}

		if (filter.status) {
			const units = f.units || [];
			if (!units.some((/** @type {any} */ u) => u.status === filter.status)) return false;
		}

		if (filter.renewable != null) {
			if (f._renewable !== filter.renewable) return false;
		}

		if (filter.networkName) {
			const network = f.network?.name || '';
			if (network.toLowerCase() !== filter.networkName.toLowerCase()) return false;
		}

		if (filter.ownerName) {
			const term = filter.ownerName.toLowerCase();
			if (!f._ownerNames.some((/** @type {string} */ n) => n.toLowerCase().includes(term))) return false;
		}

		if (filter.capacityMin != null) {
			if (f._totalCapacity < filter.capacityMin) return false;
		}

		if (filter.capacityMax != null) {
			if (f._totalCapacity > filter.capacityMax) return false;
		}

		if (filter.expectedClosureBefore) {
			const before = filter.expectedClosureBefore;
			const units = f.units || [];
			if (!units.some((/** @type {any} */ u) => u.expected_closure_date && u.expected_closure_date < before)) return false;
		}

		if (filter.expectedClosureAfter) {
			const after = filter.expectedClosureAfter;
			const units = f.units || [];
			if (!units.some((/** @type {any} */ u) => u.expected_closure_date && u.expected_closure_date >= after)) return false;
		}

		if (filter.commencedBefore) {
			const before = filter.commencedBefore;
			const units = f.units || [];
			if (!units.some((/** @type {any} */ u) => u.commencement_date && u.commencement_date < before)) return false;
		}

		if (filter.commencedAfter) {
			const after = filter.commencedAfter;
			const units = f.units || [];
			if (!units.some((/** @type {any} */ u) => u.commencement_date && u.commencement_date >= after)) return false;
		}

		if (filter.hasStorage) {
			if (f._storageCapacity <= 0) return false;
		}

		return true;
	});
}

/**
 * Perform aggregation on filtered facilities.
 * @param {any[]} facilities
 * @param {NonNullable<FacilityQuery['aggregate']>} agg
 * @returns {{ rows: any[], description: string }}
 */
function aggregate(facilities, agg) {
	const { op, field, groupBy } = agg;

	/**
	 * Get the numeric value for a facility based on the field name.
	 * @param {any} f
	 * @returns {number}
	 */
	function getValue(f) {
		switch (field) {
			case 'operatingCapacity': return f._operatingCapacity;
			case 'totalCapacity': return f._totalCapacity;
			case 'storageCapacity': return f._storageCapacity;
			case 'facilities': return 1;
			case 'units': return f._unitCount;
			default: return f._totalCapacity;
		}
	}

	/**
	 * Get the group key for a facility.
	 * @param {any} f
	 * @returns {string}
	 */
	function getGroupKey(f) {
		switch (groupBy) {
			case 'region': return f.region?.name || 'Unknown';
			case 'fuelTechGroup': return f._fuelTechGroup;
			case 'status': {
				// Use dominant unit status
				const statuses = (f.units || []).map((/** @type {any} */ u) => u.status);
				return statuses[0] || 'unknown';
			}
			case 'owner': return f._ownerNames[0] || 'Unknown';
			case 'network': return f.network?.name || 'Unknown';
			default: return 'All';
		}
	}

	if (!groupBy) {
		// Global aggregation — single row
		const values = facilities.map(getValue);
		const result = computeAgg(op, values);
		return {
			rows: [{ value: result }],
			description: `${op} of ${field}: ${result}`
		};
	}

	// Grouped aggregation
	/** @type {Record<string, number[]>} */
	const groups = {};
	for (const f of facilities) {
		const key = getGroupKey(f);
		if (!groups[key]) groups[key] = [];
		groups[key].push(getValue(f));
	}

	const rows = Object.entries(groups)
		.map(([group, values]) => ({
			group,
			value: computeAgg(op, values),
			count: values.length
		}))
		.sort((a, b) => b.value - a.value);

	return {
		rows,
		description: `${op} of ${field} grouped by ${groupBy}`
	};
}

/**
 * Compute an aggregate operation on an array of numbers.
 * @param {string} op
 * @param {number[]} values
 * @returns {number}
 */
function computeAgg(op, values) {
	if (values.length === 0) return 0;
	switch (op) {
		case 'sum': return values.reduce((a, b) => a + b, 0);
		case 'count': return values.reduce((a, b) => a + b, 0);
		case 'avg': return values.reduce((a, b) => a + b, 0) / values.length;
		case 'min': return Math.min(...values);
		case 'max': return Math.max(...values);
		default: return values.reduce((a, b) => a + b, 0);
	}
}

/**
 * Sort facilities by a computed field.
 * @param {any[]} facilities
 * @param {NonNullable<FacilityQuery['sort']>} sort
 * @returns {any[]}
 */
function sortFacilities(facilities, sort) {
	const { field, order = 'desc' } = sort;
	const mult = order === 'asc' ? 1 : -1;

	/**
	 * @param {any} f
	 * @returns {number | string}
	 */
	function getSortValue(f) {
		switch (field) {
			case 'totalCapacity': return f._totalCapacity;
			case 'operatingCapacity': return f._operatingCapacity;
			case 'storageCapacity': return f._storageCapacity;
			case 'unitCount': return f._unitCount;
			case 'name': return (f.name || '').toLowerCase();
			default: return f._totalCapacity;
		}
	}

	return [...facilities].sort((a, b) => {
		const va = getSortValue(a);
		const vb = getSortValue(b);
		if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * mult;
		if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * mult;
		return 0;
	});
}

