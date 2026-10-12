import { windowRows } from '$lib/components/charts/v2/binary-search.js';

/** How long the window must hold still before a chart reports it: the
 * generation chart's debounce, so a pan reports once, not every frame. */
const REPORT_DELAY_MS = 300;

/**
 * A facility provider chart (price, market value, emissions intensity or
 * volume) inside a chart card: the card owns its height, and the chart
 * reports what it draws (`onvisibledata`, a `ChartSnapshot` of the window,
 * the bucket straddling its start included) once the window settles — what
 * its card's download and comparison read. Call during component init.
 * @param {() => {
 *   store: import('$lib/components/charts/v2/ChartStore.svelte.js').default | null,
 *   chartHeightPx: number,
 *   viewStart: number,
 *   viewEnd: number,
 *   onvisibledata?: (snapshot: import('$lib/components/charts/card/types.js').ChartSnapshot) => void
 * }} input
 */
export function syncCardChart(input) {
	$effect(() => {
		const { store, chartHeightPx } = input();
		if (store && chartHeightPx) store.chartStyles.chartHeightPx = chartHeightPx;
	});
	$effect(() => {
		const { store, viewStart, viewEnd, onvisibledata } = input();
		if (!store || !onvisibledata || !viewStart || !viewEnd) return;
		const { seriesData, seriesNames, seriesLabels, seriesColours } = store;
		const timer = setTimeout(
			() =>
				onvisibledata({
					data: windowRows(seriesData, viewStart, viewEnd),
					seriesNames,
					seriesLabels,
					seriesColours,
					start: viewStart,
					end: viewEnd
				}),
			REPORT_DELAY_MS
		);
		return () => clearTimeout(timer);
	});
}
