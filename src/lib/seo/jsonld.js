/**
 * Stringify a JSON-LD object for embedding in a
 * `<script type="application/ld+json">` tag — called by Meta.svelte on its
 * `jsonLd` prop, the single {@html} injection point. `<` is escaped so payload
 * content can never close the script tag early (defends against e.g. a
 * "</script>" sequence in a CMS-sourced description).
 * @param {object} jsonLd
 * @returns {string}
 */
export function jsonLdToString(jsonLd) {
	return JSON.stringify(jsonLd).replace(/</g, '\\u003c');
}
