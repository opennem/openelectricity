/**
 * Canonical capacity precedence for OE units: maximum capacity where present,
 * otherwise registered. Used for all capacity display and calculations on the
 * /facilities and /facility/[code] surfaces.
 *
 * NOTE: keep this module free of imports — `$lib/og/facility-card-data.js`
 * imports it via a relative path so the plain-Node OG build script
 * (`scripts/generate-og-images.mjs`) can load it without the `$lib` alias.
 */

/**
 * Scalar core of the precedence: maximum capacity falling back to registered.
 * `||` semantics on purpose — a 0, NaN, null or '' maximum falls through to
 * registered. For callers that already hold the two values as scalars (e.g.
 * after merging OE and Sanity fields); unit objects go through
 * `getUnitCapacity`.
 * @param {number | string | null | undefined} maximum
 * @param {number | string | null | undefined} registered
 * @returns {number}
 */
export function pickCapacity(maximum, registered) {
	return Number(maximum) || Number(registered) || 0;
}

/**
 * A unit's capacity in MW: `capacity_maximum` falling back to
 * `capacity_registered`.
 *
 * Not for the solar DC:AC ratio (registered = DC array, maximum = AC
 * connection — two different quantities there, see metrics-calc.js dcAcRatio)
 * and not for `capacity_storage` (MWh).
 * @param {{ capacity_maximum?: number | string | null, capacity_registered?: number | string | null } | null | undefined} unit
 * @returns {number}
 */
export function getUnitCapacity(unit) {
	return pickCapacity(unit?.capacity_maximum, unit?.capacity_registered);
}

/**
 * Sum of per-unit capacities. The maximum→registered fallback is applied per
 * unit before summing — summing the two fields separately and picking one
 * afterwards undercounts groups that mix max-carrying and registered-only
 * units.
 * @param {any[] | null | undefined} units
 * @returns {number}
 */
export function sumUnitCapacities(units) {
	return (units ?? []).reduce((sum, unit) => sum + getUnitCapacity(unit), 0);
}

/**
 * Which field `getUnitCapacity` used — drives labels like
 * "Maximum Capacity" vs "Registered Capacity".
 * @param {{ capacity_maximum?: number | string | null, capacity_registered?: number | string | null } | null | undefined} unit
 * @returns {'maximum' | 'registered' | null}
 */
export function getUnitCapacitySource(unit) {
	if (Number(unit?.capacity_maximum)) return 'maximum';
	if (Number(unit?.capacity_registered)) return 'registered';
	return null;
}
