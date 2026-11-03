/**
 * While a series is highlighted from outside the plot (a table row),
 * everything else in the plot (the other stack layers and the overlay bands
 * and lines) fades almost away, as the legacy explorer's charts did, so the
 * highlighted series reads as in front even when it's a thin band, such as a
 * load under the zero line.
 */
export const HIGHLIGHT_DIMMED_OPACITY = 0.1;

/**
 * While the pointer on the plot highlights a series, the rest only half
 * fades: the reader is still reading the whole stack at that time.
 */
export const HOVER_DIMMED_OPACITY = 0.5;

/**
 * Opacity for a mark while `highlightId` may be set: full when nothing is
 * highlighted or the mark is the highlighted one, dimmed otherwise.
 * @param {string | null | undefined} highlightId
 * @param {string} id
 * @param {number} [opacity] - The mark's normal opacity
 * @param {number} [dimmed] - The opacity of a mark that isn't highlighted
 */
export function highlightOpacity(highlightId, id, opacity = 1, dimmed = HIGHLIGHT_DIMMED_OPACITY) {
	return !highlightId || highlightId === id ? opacity : dimmed;
}
