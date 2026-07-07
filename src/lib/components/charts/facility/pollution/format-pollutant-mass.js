/**
 * Format a mass value (assumed kg base) with the appropriate SI scale —
 * kg / t / kt / Mt for large values, g / mg / µg for sub-kilogram values.
 * Keeps each row's value readable regardless of the pollutant's magnitude
 * (NOx in tens of kt vs. dioxins in micrograms).
 *
 * @param {number | null | undefined} v
 * @returns {string}
 */
export function formatPollutantMass(v) {
	const { value, unit } = formatPollutantMassParts(v);
	return unit ? `${value} ${unit}` : value;
}

/**
 * Same scaling as `formatPollutantMass` but returns the numeric string and
 * unit separately, so callers can style them independently.
 *
 * @param {number | null | undefined} v
 * @returns {{ value: string, unit: string }}
 */
export function formatPollutantMassParts(v) {
	if (v == null) return { value: '—', unit: '' };
	if (v === 0) return { value: '0', unit: '' };
	const abs = Math.abs(v);
	const fmt = (/** @type {number} */ n) => n.toLocaleString('en-AU', { maximumFractionDigits: 2 });
	if (abs >= 1e9) return { value: fmt(v / 1e9), unit: 'Mt' };
	if (abs >= 1e6) return { value: fmt(v / 1e6), unit: 'kt' };
	if (abs >= 1e3) return { value: fmt(v / 1e3), unit: 't' };
	if (abs >= 1) return { value: fmt(v), unit: 'kg' };
	if (abs >= 1e-3) return { value: fmt(v * 1e3), unit: 'g' };
	if (abs >= 1e-6) return { value: fmt(v * 1e6), unit: 'mg' };
	return { value: fmt(v * 1e9), unit: 'µg' };
}
