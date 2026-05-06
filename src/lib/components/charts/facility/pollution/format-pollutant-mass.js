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
	if (v == null) return '—';
	if (v === 0) return '0';
	const abs = Math.abs(v);
	const fmt = (/** @type {number} */ n) =>
		n.toLocaleString('en-AU', { maximumFractionDigits: 2 });
	if (abs >= 1e9) return `${fmt(v / 1e9)} Mt`;
	if (abs >= 1e6) return `${fmt(v / 1e6)} kt`;
	if (abs >= 1e3) return `${fmt(v / 1e3)} t`;
	if (abs >= 1) return `${fmt(v)} kg`;
	if (abs >= 1e-3) return `${fmt(v * 1e3)} g`;
	if (abs >= 1e-6) return `${fmt(v * 1e6)} mg`;
	return `${fmt(v * 1e9)} µg`;
}
