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

	const positives = [...values.values()].filter(
		/** @returns {v is number} */ (v) => typeof v === 'number' && v > 0
	);
	if (!positives.length) {
		for (const code of values.keys()) out.set(code, null);
		return out;
	}

	const max = Math.max(...positives);

	for (const [code, v] of values) {
		if (v == null || v <= 0) {
			out.set(code, null);
		} else {
			out.set(code, Math.sqrt(v / max));
		}
	}

	return out;
}
