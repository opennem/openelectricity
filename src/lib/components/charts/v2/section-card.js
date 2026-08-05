/**
 * Shared card treatment for chart detail surfaces — the facility page's card
 * stack, the unit slide-out sections and the tracker's generation panel — so
 * the styling can't drift between them. `tablet:overflow-visible` lets chart
 * floating tooltips escape the card on desktop.
 */
export const sectionCardClass =
	'overflow-hidden rounded-lg border border-mid-warm-grey/40 bg-white tablet:overflow-visible';
