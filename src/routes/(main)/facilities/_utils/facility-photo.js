/**
 * Sanity image-service URL for a facility photo surface (grid tile, mobile
 * detail banner) — one place for the transform params so quality and format
 * handling stay consistent. Params are merged via the URL API so source URLs
 * that already carry query params (e.g. `?rect=` from a Sanity crop/hotspot
 * via the image builder) keep them intact.
 * @param {string} url - Sanity photo URL, with or without existing params
 * @param {{ w: number, h?: number }} size - width, plus height to crop to
 * @returns {string}
 */
export function facilityPhotoSrc(url, { w, h }) {
	const u = new URL(url);
	u.searchParams.set('w', String(w));
	if (h) {
		u.searchParams.set('h', String(h));
		u.searchParams.set('fit', 'crop');
	}
	u.searchParams.set('auto', 'format');
	u.searchParams.set('q', '75');
	return u.toString();
}
