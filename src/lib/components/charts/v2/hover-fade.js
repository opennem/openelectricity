import { fade } from 'svelte/transition';

/** How long a hover mark takes to fade in or out. */
export const HOVER_FADE_MS = 150;

/**
 * Fade a chart's hover mark (a hover or focus line, dots, band, shaded
 * sector or label) in as the pointer arrives and out as it leaves. Only the
 * mark's appearance fades: one that follows the pointer stays mounted while
 * it moves, so its position never lags. Instant under reduced motion.
 * Put it on the element whose own `{#if}` toggles: transitions are local.
 * @param {Element} node
 */
export function hoverFade(node) {
	const reduced =
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
	return fade(node, { duration: reduced ? 0 : HOVER_FADE_MS });
}
