/**
 * Shared shell for the chart toolbar tray — the recessed light-grey strip that
 * carries the date-range label with a raised-chip ChartRangeBar (`raised`
 * prop) floating on it. Used by the facility page's metrics-card header
 * (FacilityCompactCharts deliberately uses a flat toolbar row instead — its
 * sheet/pane surfaces are plain white).
 *
 * Call sites append their own rounding and padding (e.g. `rounded-t-lg py-2
 * pr-2 pl-6` as a card header).
 */
export const toolbarTrayClass =
	'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-light-warm-grey inset-shadow-sm';
