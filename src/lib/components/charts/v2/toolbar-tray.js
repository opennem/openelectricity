/**
 * Shared shell for the chart toolbar tray — the recessed light-grey strip that
 * carries the date-range label with a raised-chip ChartRangeBar (`raised`
 * prop) floating on it. One constant so the treatment can't drift between the
 * facility page's metrics-card header and FacilityCompactCharts.
 *
 * Call sites append their own rounding and padding (e.g. `rounded-lg p-2 pl-4`
 * standalone, `rounded-t-lg py-2 pr-2 pl-6` as a card header).
 */
export const toolbarTrayClass =
	'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-light-warm-grey inset-shadow-sm';
