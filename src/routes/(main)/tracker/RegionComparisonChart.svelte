<script>
	import { comparisonMetric } from './comparison-metrics.js';
	import { onDestroy, untrack } from 'svelte';
	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { createViewportGestures } from '$lib/components/charts/v2/viewport-gestures.js';
	import {
		COMPARISON_REGIONS,
		comparisonPeriod,
		comparisonChartRows,
		comparisonYDomain
	} from './region-comparison.js';

	/** @type {{data: Record<string, any[]>, regions: string[], metric: string, basis: 'demand' | 'generation', interval: string,
	 * viewport: {start:number,end:number}, bounds: {start:number,end:number}, height: number,
	 * engaged: boolean, hover: number | null, focus: number | null, onhover: (time:number | null) => void, onfocus: (time:number | null) => void,
	 * onviewport: (start:number,end:number,settled:boolean) => void}} */
	let {
		data,
		regions,
		metric,
		basis,
		interval,
		viewport,
		bounds,
		height,
		engaged = $bindable(false),
		hover,
		focus,
		onhover,
		onfocus,
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
	const inspectionHintId = $props.id();
	let definition = $derived(comparisonMetric(metric));
	let rows = $derived(comparisonChartRows(data, regions, metric, basis, interval));
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
		chart.seriesLabels = Object.fromEntries(COMPARISON_REGIONS.map((r) => [r.value, r.shortLabel]));
		chart.seriesColours = Object.fromEntries(COMPARISON_REGIONS.map((r) => [r.value, r.colour]));
		chart.title = definition.shortLabel;
		chart.chartTooltips.showTotal = false;
		chart.maximumFractionDigits = 1;
		chart.chartStyles.chartHeightPx = height;
		chart.chartStyles.chartPadding = { top: 0, bottom: 20, left: 0, right: 0 };
		chart.chartStyles.snapTicks = true;
		chart.formatTooltipX = (date) => comparisonPeriod(Number(date), interval);
		const short = viewport.end - viewport.start < 3 * 365 * 86_400_000;
		chart.formatTickX = (date) =>
			new Date(date).toLocaleDateString('en-AU', {
				timeZone: 'UTC',
				year: 'numeric',
				...(short ? { month: 'short' } : {})
			});
		chart.setXDomain(viewport.start, viewport.end);
		// Tick counts are bounded independently of monthly history length.
		const step = Math.max(
			1,
			Math.ceil(
				rows.filter((row) => row.time >= viewport.start && row.time < viewport.end).length / 6
			)
		);
		const ticks = rows
			.filter((row) => row.time >= viewport.start && row.time < viewport.end)
			.filter((_, i) => i % step === 0)
			.map((row) => row.date);
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
		if (focus == null) chart.clearFocus();
		else chart.setFocus(focus);
	});
	const gestures = createViewportGestures({
		viewport: () => viewport,
		apply: (start, end) => onviewport(start, end, false),
		minDateMs: () => bounds.start,
		minDurationMs: () => 366 * 86_400_000,
		maxDurationMs: () => bounds.end - bounds.start,
		onGestureStart: () => onhover(null),
		onSettle: (start, end) => onviewport(start, end, true)
	});
	onDestroy(gestures.dispose);
	/** @param {KeyboardEvent} event */
	function inspect(event) {
		if (event.target !== event.currentTarget) return;
		const visible = rows.filter((row) => row.time >= viewport.start && row.time < viewport.end);
		if (!visible.length) return;
		const current = hover ?? focus ?? visible[visible.length - 1].time;
		const index = Math.max(
			0,
			visible.findIndex((row) => row.time === current)
		);
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			event.preventDefault();
			onhover(
				visible[
					Math.max(0, Math.min(visible.length - 1, index + (event.key === 'ArrowLeft' ? -1 : 1)))
				].time
			);
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			onfocus(focus === current ? null : current);
		} else if (event.key === 'Escape') {
			onhover(null);
			onfocus(null);
		}
	}
</script>

<div role="group" aria-label={`${definition.label} comparison chart`} class="relative">
	<StratumChart
		{chart}
		tooltipMode="floating"
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
		isAtMinZoom={viewport.end - viewport.start <= 366 * 86_400_000}
		isAtMaxZoom={viewport.start <= bounds.start && viewport.end >= bounds.end}
		onhover={(time) => onhover(time)}
		onhoverend={() => onhover(null)}
		onfocus={(time) => onfocus(focus === time ? null : time)}
	/>
	<button
		type="button"
		class="sr-only focus:not-sr-only focus:absolute focus:bottom-2 focus:left-2 focus:z-30 rounded border border-mid-warm-grey bg-white px-3 py-2 text-xs focus:outline focus:outline-dark-grey"
		onkeydown={inspect}
		onclick={() =>
			onhover(
				rows.filter((row) => row.time >= viewport.start && row.time < viewport.end).at(-1)?.time ??
					null
			)}
		aria-label={`Inspect ${definition.label.toLowerCase()} values`}
		aria-describedby={inspectionHintId}>Inspect values</button
	>
	<span id={inspectionHintId} class="sr-only"
		>Use left and right arrows to inspect a period, Enter to pin it, and Escape to clear it.</span
	>
</div>
