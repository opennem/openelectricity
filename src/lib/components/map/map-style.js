/**
 * Shared class for the floating circular map buttons (options trigger, reset,
 * mobile zoom/back) — the map legends' material (white/95 + blur + soft
 * shadow) with a thin border, so every piece of floating map chrome reads as
 * one set. The MapLibre +/- control is matched to this in `app.css`
 * (`.maplibregl-ctrl-group`).
 */
export const MAP_FAB_CLASS =
	'rounded-full bg-white/95 backdrop-blur-sm border border-mid-warm-grey shadow-md flex items-center justify-center hover:bg-light-warm-grey transition-colors cursor-pointer';

/** The map's neutral white chip/card surface — price chips, the tracker's
 *  on-anchor chart cards and the map-charts range annotation all share it so
 *  the "white card on basemap" look stays one decision. Compose per-surface
 *  padding/typography on top. */
export const MAP_CHIP_CLASS = 'rounded-lg border border-black/10 bg-white/95 shadow-sm';

/**
 * Base-map themes shared by every map surface and accepted by the Tracker's
 * `?theme=` validator.
 * @type {readonly string[]}
 */
export const MAP_THEMES = ['light', 'dark', 'satellite'];

/** Facilities-specific themes, with Voyager as the default. */
export const FACILITIES_MAP_THEMES = ['voyager', ...MAP_THEMES];

/**
 * Whether a theme uses light-map overlay colours.
 * @param {string} theme
 * @returns {boolean}
 */
export function isLightMapTheme(theme) {
	return theme === 'light' || theme === 'voyager';
}

/**
 * Default overview framing for the continent-level /facilities map. The
 * tracker map frames itself tighter with its own route-local DEFAULT_VIEW —
 * its content is NEM-biased.
 */
export const AUSTRALIA_VIEW = Object.freeze({
	center: Object.freeze({ lng: 134, lat: -25 }),
	zoom: 3.5
});

/**
 * Map style URL for a theme — the single definition shared by every MapLibre
 * surface (/facilities, /facility/[code], /tracker). Styles are locally
 * hosted copies with the glyphs URL swapped to our own `/fonts/...` path —
 * CARTO's hosted fonts CDN 404s on `DM_Mono`, which broke labels when we
 * pointed straight at the upstream JSON.
 *
 * @param {'voyager' | 'light' | 'dark' | 'satellite'} theme
 * @returns {string}
 */
export function mapStyleForTheme(theme) {
	if (theme === 'voyager') return '/map-styles/voyager.json';
	if (theme === 'satellite') return '/map-styles/satellite.json';
	if (theme === 'dark') return '/map-styles/dark-matter.json';
	return '/map-styles/positron.json';
}
