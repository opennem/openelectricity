/**
 * Returns true if the given hostname is a non-production environment:
 * local development, the staging site (`dev.openelectricity.org.au`),
 * or a Cloudflare Pages preview deployment.
 *
 * Cloudflare Pages serves production at `<project>.pages.dev` (3 labels)
 * and previews at `<hash-or-branch>.<project>.pages.dev` (4+ labels),
 * so the extra subdomain distinguishes a preview from production.
 *
 * @param {string | undefined | null} hostname
 * @returns {boolean}
 */
export function isNonProductionHost(hostname) {
	if (!hostname) return false;
	const h = hostname.toLowerCase();
	if (h === 'localhost' || h === '127.0.0.1') return true;
	if (h.startsWith('dev.')) return true;
	if (h.endsWith('.pages.dev') && h.split('.').length > 3) return true;
	return false;
}
