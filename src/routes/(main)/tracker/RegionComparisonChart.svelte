<script>
	import { comparisonMetric } from './comparison-metrics.js';
	import { onDestroy, untrack } from 'svelte';
	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { createViewportGestures } from '$lib/components/charts/v2/viewport-gestures.js';
	import { inspectionStep } from './comparison-inspection.js';
	import {
		COMPARISON_REGIONS,
		comparisonPeriod,
		comparisonChartRows,
		comparisonTickLabel,
		comparisonTicks,
		comparisonYDomain,
		COMPARISON_MIN_SPAN_MS,
		visibleComparisonRows
	} from './region-comparison.js';

	/** Region labels and colours never change: set once on the store. */
	const SERIES_LABELS = Object.fromEntries(COMPARISON_REGIONS.map((r) => [r.value, r.label]));
	const SERIES_COLOURS = Object.fromEntries(COMPARISON_REGIONS.map((r) => [r.value, r.colour]));

	/** @type {{data: Record<string, any[]>, regions: string[], metric: string, basis: 'demand' | 'generation', interval: string, filter: string | null,
	 * viewport: {start:number,end:number}, bounds: {start:number,end:number}, height: number,
	 * tooltip: boolean, engaged: boolean, hover: number | null, focus: number | null, onhover: (time:number | null) => void, onfocus: (time:number | null) => void,
	 * hoverRegion: string | null, onhoverregion: (region: string | null) => void,
	 * onviewport: (start:number,end:number,settled:boolean) => void}} */
	let {
		data,
		regions,
		metric,
		basis,
		interval,
		filter,
		viewport,
		bounds,
		height,
		tooltip,
		engaged = $bindable(false),
		hover,
		focus,
		onhover,
		onfocus,
		hoverRegion,
		onhoverregion,
		onviewport
	} = $props();
	const chart = new ChartStore({
		key: Symbol('region-comparison'),
		title: untrack(() => metric),
		chartType: 'line',
		timeZone: 'UTC',
		hideDataOptions: true,
		hideChartTypeOptions: true
	});
	chart.seriesLabels = SERIES_LABELS;
	chart.seriesColours = SERIES_COLOURS;
	chart.chartTooltips.showTotal = false;
	chart.maximumFractionDigits = 1;
	chart.chartStyles.chartPadding = { top: 0, bottom: 20, left: 0, right: 0 };
	chart.chartStyles.snapTicks = true;
	// A region's line takes the pointer, naming its row in the Regions table;
	// the hovered region stands out on every card while the others recede.
	chart.chartStyles.lineHitWidth = 10;
	chart.chartOptions.allowHoverHighlight = true;
	const inspectionHintId = $props.id();
	let definition = $derived(comparisonMetric(metric));
	let rows = $derived(comparisonChartRows(data, regions, metric, basis, interval, filter));
	let visibleRows = $derived(visibleComparisonRows(rows, viewport));
	// Each effect syncs one concern into the store, so a pan frame re-runs only
	// the viewport sync rather than rebuilding labels, data and units.
	$effect(() => {
		chart.chartOptions.baseUnit =
			definition.kind === 'energy'
				? 'Wh'
				: definition.kind === 'intensity'
					? 'kgCO₂e/MWh'
					: definition.kind === 'price'
						? '$/MWh'
						: '%';
		chart.chartOptions.prefix = definition.kind === 'energy' ? 'M' : '';
		chart.chartOptions.setAutomaticDisplayPrefix(definition.kind === 'energy' ? 'G' : '');
		chart.chartOptions.allowedPrefixes = definition.kind === 'energy' ? ['M', 'G', 'T'] : [];
	});
	$effect(() => {
		chart.seriesData = rows;
		chart.seriesNames = regions;
		chart.title = definition.shortLabel;
		chart.formatTooltipX = (date) => comparisonPeriod(Number(date), interval);
	});
	$effect(() => {
		chart.chartStyles.chartHeightPx = height;
	});
	$effect(() => {
		chart.formatTickX = (date) => comparisonTickLabel(Number(date), viewport);
		chart.setXDomain(viewport.start, viewport.end);
		const ticks = comparisonTicks(visibleRows, interval, filter);
		chart.xTicks = ticks;
		chart.xGridlineTicks = ticks;
	});
	$effect(() => {
		const domain = chart.renderXDomain;
		chart.setYDomain(
			comparisonYDomain(
				chart.seriesScaledData,
				regions,
				domain ? { start: domain[0], end: domain[1] } : viewport,
				chart.chartOptions.selectedCurveType
			)
		);
	});
	$effect(() => {
		if (hover == null) chart.clearHover();
		else chart.setHover(hover);
		chart.hoverKey = hoverRegion ?? undefined;
		if (focus == null) chart.clearFocus();
		else chart.setFocus(focus);
	});
	const gestures = createViewportGestures({
		viewport: () => viewport,
		apply: (start, end) => onviewport(start, end, false),
		minDateMs: () => bounds.start,
		minDurationMs: () => COMPARISON_MIN_SPAN_MS,
		maxDurationMs: () => bounds.end - bounds.start,
		onGestureStart: () => onhover(null),
		onSettle: (start, end) => onviewport(start, end, true)
	});
	onDestroy(gestures.dispose);
	/** @param {KeyboardEvent} event */
	function inspect(event) {
		if (event.target !== event.currentTarget) return;
		const step = inspectionStep(event.key, visibleRows, hover, focus);
		if (!step) return;
		if (event.key !== 'Escape') event.preventDefault();
		if ('hover' in step) onhover(step.hover ?? null);
		if ('focus' in step) onfocus(step.focus ?? null);
	}
</script>

<div role="group" aria-label={`${definition.label} comparison chart`} class="relative">
	<StratumChart
		{chart}
		tooltipMode={tooltip ? 'floating' : 'none'}
		enablePan
		panZoomMode="tap-to-engage"
		bind:engaged
		zoomMode="static"
		onpanstart={gestures.handlePanStart}
		onpan={gestures.handlePan}
		onpanend={gestures.handlePanEnd}
		onzoom={gestures.handleZoom}
		onzoomin={gestures.zoomIn}
		onzoomout={gestures.zoomOut}
		isAtMinZoom={viewport.end - viewport.start <= COMPARISON_MIN_SPAN_MS}
		isAtMaxZoom={viewport.start <= bounds.start && viewport.end >= bounds.end}
		onhover={(time, key) => {
			onhover(time);
			// Only a line names a region; the plot's own hover keeps it until
			// that line reports leaving.
			if (key !== undefined) onhoverregion(key);
		}}
		onhoverend={() => {
			onhover(null);
			onhoverregion(null);
		}}
		onfocus={(time) => onfocus(focus === time ? null : time)}
	/>
	<button
		type="button"
		class="sr-only focus:not-sr-only focus:absolute focus:bottom-2 focus:left-2 focus:z-30 rounded border border-mid-warm-grey bg-white px-3 py-2 text-xs focus:outline focus:outline-dark-grey"
		onkeydown={inspect}
		onclick={() => onhover(visibleRows.at(-1)?.time ?? null)}
		aria-label={`Inspect ${definition.label.toLowerCase()} values`}
		aria-describedby={inspectionHintId}>Inspect values</button
	>
	<span id={inspectionHintId} class="sr-only"
		>Use left and right arrows to inspect a period, Enter to pin it, and Escape to clear it.</span
	>
</div>
