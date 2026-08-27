<script>
	/**
	 * RegionMiniChart — one map-view mini chart (inside a region Marker card,
	 * or the docked All-Australia card, which passes a taller `chartHeightPx`).
	 *
	 * A bare Stratum render of pre-processed rows from `map-minis.js`: no
	 * header, no tooltip, no pan/zoom — the chart surfaces are
	 * pointer-events-none so map gestures pass straight through. Instead of
	 * full axes, two dashed reference lines carry the scale (zero, and the
	 * window's stacked-total max with its value); the shared window's date
	 * range renders once in the All-Australia card's footer, not per card.
	 * Generation/emissions stack with the homepage visual (cumulative stack,
	 * loads below zero); price is a line. The fixed 24h window means the store
	 * is fully re-fed on each refresh rather than managed.
	 */

	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { peakBucket } from '$lib/components/charts/facility/metrics/metrics-calc.js';
	import { getNumberFormat } from '$lib/utils/formatters';

	/**
	 * @type {{
	 *   processed: { data: any[], seriesNames: string[], seriesLabels: Record<string, string>, seriesColours: Record<string, string> },
	 *   metric?: 'power' | 'price' | 'emissions',
	 *   chartHeightPx?: number
	 * }}
	 */
	let { processed, metric = 'power', chartHeightPx = 80 } = $props();

	const fmt0 = getNumberFormat(0);
	const REF_LINE_COLOUR = '#33333355';

	let chartStore = $derived.by(() => {
		const chart = new ChartStore({
			key: Symbol('region-mini'),
			title: '',
			prefix: metric === 'power' ? 'M' : '',
			displayPrefix: metric === 'power' ? 'M' : '',
			baseUnit: metric === 'power' ? 'W' : metric === 'price' ? '$/MWh' : 't',
			chartType: metric === 'price' ? 'line' : undefined
		});
		// Sparkline treatment: no axes — the 0/max reference lines carry the
		// scale. Top padding gives the max label (drawn above its line) room.
		chart.chartStyles.chartHeightPx = chartHeightPx;
		chart.chartStyles.chartPadding = { top: 16, right: 0, bottom: 4, left: 0 };
		chart.chartStyles.showAxes = false;
		if (metric === 'emissions') {
			chart.chartOptions.selectedCurveType = /** @type {any} */ ('step');
		}
		return chart;
	});

	/** Peak of the visible shape — the stacked positive total per bucket for
	 *  the stacked metrics, which for the single price series is the plain max. */
	let maxY = $derived(peakBucket(processed.data, processed.seriesNames)?.value ?? 0);

	/**
	 * Ceiling to two significant digits — the axis max reads as a round number
	 * (12,345 → 13,000; 318 → 320) while staying close to the data.
	 * @param {number} value
	 */
	function niceCeil(value) {
		if (value <= 0) return 0;
		const step = Math.pow(10, Math.floor(Math.log10(value)) - 1);
		return Math.ceil(value / step) * step;
	}

	let refMax = $derived(niceCeil(maxY));

	let maxLabel = $derived.by(() => {
		if (refMax <= 0) return '';
		if (metric === 'price') return `$${fmt0.format(refMax)}`;
		return `${fmt0.format(refMax)} ${metric === 'power' ? 'MW' : 't'}`;
	});

	// Re-feed the store on every refresh — tiny fixed-window data, no manager.
	$effect(() => {
		const rows = processed.data;
		chartStore.seriesData = rows;
		chartStore.seriesNames = processed.seriesNames;
		chartStore.seriesColours = processed.seriesColours;
		chartStore.seriesLabels = processed.seriesLabels;
		if (rows.length) {
			chartStore.setXDomain(rows[0].time, rows[rows.length - 1].time);
		}
		// Pin the domain to [lowest stacked/series point (or zero), rounded-up
		// max] so both reference lines sit inside the plot — the price line's
		// auto domain floats above zero on expensive days, and the rounded max
		// must be the top edge rather than a line above it.
		if (rows.length && refMax > 0) {
			let min = 0;
			for (const row of rows) {
				let bottom = 0;
				for (const name of processed.seriesNames) {
					const val = row[name];
					if (typeof val === 'number' && val < 0) bottom += val;
				}
				if (bottom < min) min = bottom;
			}
			chartStore.setYDomain([min, refMax]);
		} else {
			chartStore.setYDomain(undefined);
		}
		chartStore.yReferenceLines = maxLabel
			? [
					{
						value: 0,
						label: '0',
						colour: REF_LINE_COLOUR,
						labelPosition: 'left',
						labelClass: 'text-xs'
					},
					{
						value: refMax,
						label: maxLabel,
						colour: REF_LINE_COLOUR,
						labelPosition: 'right',
						labelClass: 'text-xs'
					}
				]
			: [];
	});
</script>

<StratumChart
	chart={chartStore}
	showHeader={false}
	tooltipMode="none"
	zoomMode="none"
	enablePan={false}
/>
