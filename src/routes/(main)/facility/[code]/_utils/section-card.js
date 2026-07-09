/**
 * Shared card treatment for the facility detail surfaces — the main page's
 * card stack and the unit slide-out sections — so the styling can't drift
 * between the two. `tablet:overflow-visible` lets chart floating tooltips
 * escape the card on desktop.
 */
export const sectionCardClass =
	'overflow-hidden rounded-lg border border-mid-warm-grey/40 bg-white tablet:overflow-visible';
