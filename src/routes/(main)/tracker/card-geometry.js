/**
 * Map-view card geometry, shared between the marker layer
 * (`RegionChartMarkers`) and the map's focus fits (`Map.svelte`), which
 * extend their bounds and padding so the fitted scope's cards stay fully on
 * screen — the cards are fixed-pixel DOM markers, so a geographic fit knows
 * nothing about their footprint unless told.
 */

import { REGION_ANCHORS, WEM_ANCHOR } from '$lib/flows/region-geo.js';

/** Card positions that differ from the region anchor — pushed out to sea so
 *  the busy corridor labels stay readable (NSW/VIC east into the Tasman,
 *  TAS west clear of the Basslink label); a dotted leader ties each card
 *  back to the region point it describes. @type {Record<string, [number, number]>} */
export const CARD_ANCHORS = {
	NSW1: [155.2, -31.8],
	VIC1: [151.4, -39.4],
	TAS1: [141.8, -42.5]
};

/** Which of the card's four mid-edge anchor points (always the middle of
 *  that edge) sits on the card's lnglat — offshore cards attach on the edge
 *  facing their region; on-anchor cards keep bottom-middle, floating just
 *  above their region dot. @type {Record<string, 'left' | 'right' | 'top' | 'bottom'>} */
export const CARD_SIDES = {
	NSW1: 'left',
	VIC1: 'left',
	TAS1: 'right'
};

/** Rendered card footprint in CSS px (the w-52 card; header + chart body) —
 *  what a focus fit reserves as extra padding so a card anchored at the
 *  fitted edge still fits on canvas. */
export const CARD_PX = { width: 208, height: 132 };

export const NEM_CARD_CODES = Object.keys(REGION_ANCHORS);
export const ALL_CARD_CODES = [...NEM_CARD_CODES, 'WEM'];

/**
 * A card's anchor point and attachment side.
 * @param {string} code
 * @returns {{ lnglat: [number, number], side: 'left' | 'right' | 'top' | 'bottom' }}
 */
export function cardPlacement(code) {
	const lnglat = CARD_ANCHORS[code] ?? (code === 'WEM' ? WEM_ANCHOR : REGION_ANCHORS[code]);
	return { lnglat, side: CARD_SIDES[code] ?? 'bottom' };
}
