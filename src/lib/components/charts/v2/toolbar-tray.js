/**
 * Shared shell for the recessed chart toolbar. Compact chart hosts use their
 * existing white surface instead.
 *
 * Call sites append their own rounding and padding (e.g. `rounded-t-lg py-2
 * pr-2 pl-6` as a card header).
 */
export const toolbarTrayClass =
	'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-light-warm-grey inset-shadow-sm';
