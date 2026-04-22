/**
 * Returns true if the given hostname is a non-production environment:
 * local development, the staging site (`dev.openelectricity.org.au`),
 * or any Cloudflare Pages preview deployment (`*.pages.dev`).
 *
 * @param {string | undefined | null} hostname
 * @returns {boolean}
 */
export function isNonProductionHost(hostname) {
	if (!hostname) return false;
	return (
		hostname === 'localhost' ||
		hostname === '127.0.0.1' ||
		hostname.startsWith('dev.') ||
		hostname.endsWith('.pages.dev')
	);
}
