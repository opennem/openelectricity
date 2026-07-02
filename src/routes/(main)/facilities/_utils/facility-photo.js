/**
 * Sanity image-service URL for a facility photo surface (grid tile, mobile
 * detail banner) — one place for the transform params so quality and format
 * handling stay consistent.
 * @param {string} url - raw Sanity photo URL
 * @param {{ w: number, h?: number }} size - width, plus height to crop to
 * @returns {string}
 */
export function facilityPhotoSrc(url, { w, h }) {
	const crop = h ? `&h=${h}&fit=crop` : '';
	return `${url}?w=${w}${crop}&auto=format&q=75`;
}
