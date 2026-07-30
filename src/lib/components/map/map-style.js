/**
 * Shared class for the floating circular map buttons (options trigger, reset,
 * mobile zoom/back) — the map legends' material (white/95 + blur + soft
 * shadow) with a thin border, so every piece of floating map chrome reads as
 * one set. The MapLibre +/- control is matched to this in `app.css`
 * (`.maplibregl-ctrl-group`).
 */
export const MAP_FAB_CLASS =
	'rounded-full bg-white/95 backdrop-blur-sm border border-mid-warm-grey shadow-md flex items-center justify-center hover:bg-light-warm-grey transition-colors cursor-pointer';

/**
 * The base-map theme vocabulary — the single list the URL validators
 * (/facilities, /explorer `?theme=`) agree on. UI labels stay with the
 * controls (MapOptionsDropdown).
 * @type {readonly string[]}
 */
export const MAP_THEMES = ['light', 'dark', 'satellite'];

/**
 * Default overview framing for the continent-level maps (/facilities,
 * /explorer) — one definition so their initial views can't drift.
 */
export const AUSTRALIA_VIEW = Object.freeze({
	center: Object.freeze({ lng: 134, lat: -25 }),
	zoom: 3.5
});

/**
 * Map style URL for a theme — the single definition shared by every MapLibre
 * surface (/facilities, /facility/[code], /explorer). Styles are locally
 * hosted copies with the glyphs URL swapped to our own `/fonts/...` path —
 * CARTO's hosted fonts CDN 404s on `DM_Mono`, which broke labels when we
 * pointed straight at the upstream JSON.
 *
 * @param {'light' | 'dark' | 'satellite'} theme
 * @returns {string}
 */
export function mapStyleForTheme(theme) {
	if (theme === 'satellite') return '/map-styles/satellite.json';
	if (theme === 'dark') return '/map-styles/dark-matter.json';
	return '/map-styles/positron.json';
}
