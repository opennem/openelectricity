<script>
	import { untrack } from 'svelte';
	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { comparisonChartUnits, formatComparisonCell } from './comparison-metrics.js';
	import { COMPARISON_REGIONS, comparisonTickLabel } from './region-comparison.js';

	/**
	 * One region's panel in the Panels display: a short line chart of that
	 * region over the shared viewport and y-scale, with every other selected
	 * region drawn behind it as a grey ghost line for context. Its label row
	 * (an SVG, so PNG export keeps it) names the region and reads its value
	 * for the inspected period, or the latest one on screen.
	 * @type {{region: string, regions: string[], rows: any[], metric: string,
	 *   viewport: {start: number, end: number}, domain: [number, number], ticks: Date[],
	 *   hover: number | null, focus: number | null, highlighted: boolean,
	 *   onhover: (time: number | null) => void, onfocus: (time: number | null) => void,
	 *   onhoverregion: (region: string | null) => void}} */
	let {
		region,
		regions,
		rows,
		metric,
		viewport,
		domain,
		ticks,
		hover,
		focus,
		highlighted,
		onhover,
		onfocus,
		onhoverregion
	} = $props();

	const GHOST = '#D9D9D9';
	const LABEL_HEIGHT = 22;
	const info = untrack(() => COMPARISON_REGIONS.find((r) => r.value === region));
	const colour = info?.colour ?? '#333333';
	const chart = new ChartStore({
		key: Symbol('region-panel'),
		title: info?.shortLabel ?? untrack(() => region),
		chartType: 'line',
		timeZone: 'UTC',
		hideDataOptions: true,
		hideChartTypeOptions: true
	});
	chart.chartTooltips.showTotal = false;
	chart.maximumFractionDigits = 1;
	chart.chartStyles.chartHeightPx = 120;
	chart.chartStyles.chartPadding = { top: 4, bottom: 20, left: 0, right: 0 };
	chart.chartStyles.snapTicks = true;
	chart.yTicks = 3;
	chart.chartOptions.allowHoverHighlight = false;
	// This region's line reads a touch heavier than the ghosts behind it.
	chart.chartStyles.seriesStrokeWidths = { [untrack(() => region)]: 2.5 };
	$effect(() => {
		const units = comparisonChartUnits(metric);
		chart.chartOptions.baseUnit = units.baseUnit;
		chart.chartOptions.prefix = units.prefix;
		chart.chartOptions.setAutomaticDisplayPrefix(units.display);
		chart.chartOptions.allowedPrefixes = units.allowed;
	});
	// The ghosts are series drawn first, so this region's line sits on top.
	let others = $derived(regions.filter((id) => id !== region));
	$effect(() => {
		chart.seriesNames = [...others, region];
		chart.seriesColours = Object.fromEntries([
			...others.map((id) => [id, GHOST]),
			[region, colour]
		]);
		chart.seriesData = rows;
	});
	$effect(() => {
		chart.formatTickX = (date) => comparisonTickLabel(Number(date), viewport);
		chart.setXDomain(viewport.start, viewport.end);
		chart.xTicks = ticks;
		chart.xGridlineTicks = ticks;
	});
	$effect(() => {
		chart.setYDomain(domain);
	});
	$effect(() => {
		if (hover == null) chart.clearHover();
		else chart.setHover(hover);
		if (focus == null) chart.clearFocus();
		else chart.setFocus(focus);
	});

	/** The inspected period's value, or the latest on screen. */
	let value = $derived.by(() => {
		const inspected = hover ?? focus;
		if (inspected != null) return rows.find((row) => row.time === inspected)?.[region];
		for (let i = rows.length - 1; i >= 0; i--) {
			const row = rows[i];
			if (row.time < viewport.end && row.time >= viewport.start && Number.isFinite(row[region]))
				return row[region];
		}
		return null;
	});
	let width = $state(0);
</script>

<div
	role="presentation"
	class="min-w-0 rounded-md transition-colors {highlighted ? 'bg-light-warm-grey/60' : ''}"
	data-region={region}
	bind:clientWidth={width}
>
	<svg data-png-layer {width} height={LABEL_HEIGHT} class="block" aria-hidden="true">
		<circle cx="5" cy={LABEL_HEIGHT / 2} r="4" fill={colour} />
		<text
			x="15"
			y={LABEL_HEIGHT / 2}
			dominant-baseline="central"
			class="fill-dark-grey text-xs {highlighted ? 'font-semibold' : ''}"
			fill="currentColor">{info?.shortLabel ?? region}</text
		>
		<text
			x={width}
			y={LABEL_HEIGHT / 2}
			dominant-baseline="central"
			text-anchor="end"
			class="fill-dark-grey font-mono text-xs"
			fill="currentColor">{formatComparisonCell(value, metric, {})}</text
		>
	</svg>
	<StratumChart
		{chart}
		showHeader={false}
		tooltipMode="none"
		zoomMode="none"
		enablePan={false}
		onhover={(time) => {
			onhover(time);
			onhoverregion(region);
		}}
		onhoverend={() => {
			onhover(null);
			onhoverregion(null);
		}}
		onfocus={(time) => onfocus(focus === time ? null : time)}
	/>
</div>
