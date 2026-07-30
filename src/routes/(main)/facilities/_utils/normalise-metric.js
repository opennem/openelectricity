/**
 * Largest positive value in the set — the denominator `normaliseMetric` scales
 * against. Exported so the map's size legend can map a raw value back onto the
 * same 0..1 range without re-deriving the maximum.
 *
 * @param {Map<string, number | null | undefined>} values
 * @returns {number} 0 when nothing in the set is positive
 */
export function metricMax(values) {
	let max = 0;
	for (const v of values?.values() ?? []) {
		if (typeof v === 'number' && v > max) max = v;
	}
	return max;
}

/**
 * Place one raw value on the 0..1 visual scale — sqrt of its ratio to the set's
 * maximum. Exported so the map key's radius scale runs the same arithmetic the
 * markers do rather than restating it.
 *
 * @param {number} value
 * @param {number} max
 * @returns {number}
 */
export function normaliseValue(value, max) {
	return Math.sqrt(value / max);
}

/**
 * Normalise raw metric values (capacity in MW, generation in MW, pollution in
 * kg, etc.) to a 0..1 visual range using a sqrt-of-ratio scale. Sqrt gives
 * area-perception parity — a facility with 4× the value renders 2× the
 * radius, which matches how `circle-radius` interpolates linearly on the
 * already-square-rooted source.
 *
 * Returns `null` for facilities with missing or non-positive values so the
 * caller can flag them as `metric_missing` for opacity dimming.
 *
 * @param {Map<string, number | null | undefined>} values
 * @returns {Map<string, number | null>}
 */
export function normaliseMetric(values) {
	/** @type {Map<string, number | null>} */
	const out = new Map();
	if (!values?.size) return out;

	const max = metricMax(values);
	if (!max) {
		for (const code of values.keys()) out.set(code, null);
		return out;
	}

	for (const [code, v] of values) {
		if (v == null || v <= 0) {
			out.set(code, null);
		} else {
			out.set(code, normaliseValue(v, max));
		}
	}

	return out;
}
