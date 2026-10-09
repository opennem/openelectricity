/**
 * The environment a hostname belongs to: local development (including the
 * per-project `*.localhost` dev hosts), the staging site
 * (`dev.openelectricity.org.au`), a Cloudflare Pages preview, or production.
 *
 * Cloudflare Pages serves production at `<project>.pages.dev` (3 labels)
 * and previews at `<hash-or-branch>.<project>.pages.dev` (4+ labels),
 * so the extra subdomain distinguishes a preview from production.
 *
 * @param {string | undefined | null} hostname
 * @returns {'development' | 'staging' | 'preview' | 'production'}
 */
export function hostEnvironment(hostname) {
	const h = (hostname ?? '').toLowerCase();
	if (h === 'localhost' || h === '127.0.0.1' || h.endsWith('.localhost')) return 'development';
	if (h.startsWith('dev.')) return 'staging';
	if (h.endsWith('.pages.dev') && h.split('.').length > 3) return 'preview';
	return 'production';
}

/**
 * Whether a hostname is anything but production (`hostEnvironment`).
 * @param {string | undefined | null} hostname
 * @returns {boolean}
 */
export function isNonProductionHost(hostname) {
	return !!hostname && hostEnvironment(hostname) !== 'production';
}

/**
 * Returns true if the given hostname belongs to an Open Electricity site —
 * the apex domain or any subdomain (e.g. `explore.openelectricity.org.au`).
 *
 * @param {string | undefined | null} hostname
 * @returns {boolean}
 */
export function isOpenElectricityHost(hostname) {
	if (!hostname) return false;
	return /(^|\.)openelectricity\.org\.au$/.test(hostname.toLowerCase());
}
