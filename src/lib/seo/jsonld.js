/**
 * Stringify a JSON-LD object for embedding in a
 * `<script type="application/ld+json">` tag (see Meta.svelte's jsonLd prop).
 * `<` is escaped so payload content can never close the script tag early
 * (defends the {@html} injection point against e.g. a "</script>" sequence
 * in a CMS-sourced description).
 * @param {object} jsonLd
 * @returns {string}
 */
export function jsonLdToString(jsonLd) {
	return JSON.stringify(jsonLd).replace(/</g, '\\u003c');
}
