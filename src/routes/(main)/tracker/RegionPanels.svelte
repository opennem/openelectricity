<script>
	import { onDestroy } from 'svelte';
	import { createViewportGestures } from '$lib/components/charts/v2/viewport-gestures.js';
	import StaticZoomButtons from '$lib/components/charts/v2/StaticZoomButtons.svelte';
	import { comparisonChartUnits, comparisonMetric } from './comparison-metrics.js';
	import { inspectionStep } from './comparison-inspection.js';
	import RegionPanel from './RegionPanel.svelte';
	import RegionTooltip from './RegionTooltip.svelte';
	import {
		COMPARISON_MIN_SPAN_MS,
		COMPARISON_REGIONS,
		comparisonChartRows,
		comparisonPeriod,
		comparisonTicks,
		comparisonYDomain,
		visibleComparisonRows
	} from './region-comparison.js';

	/**
	 * Small multiples for one comparison metric: a panel per region, all on
	 * the same viewport and y-scale so their heights compare directly, each
	 * with the other regions as grey ghost lines behind it. Hovering a panel
	 * inspects that period in every panel and names its region to the Regions
	 * table. Zoom is by the buttons; the panels do not drag-pan.
	 * @type {{data: Record<string, any[]>, regions: string[], metric: string,
	 *   basis: 'demand' | 'generation', interval: string, months: number,
	 *   viewport: {start: number, end: number}, bounds: {start: number, end: number},
	 *   tooltip: boolean, hover: number | null, focus: number | null, hoverRegion: string | null,
	 *   onhover: (time: number | null) => void, onfocus: (time: number | null) => void,
	 *   onhoverregion: (region: string | null) => void,
	 *   onviewport: (start: number, end: number, settled: boolean) => void}} */
	let {
		data,
		regions,
		metric,
		basis,
		interval,
		months,
		viewport,
		bounds,
		tooltip,
		hover,
		focus,
		hoverRegion,
		onhover,
		onfocus,
		onhoverregion,
		onviewport
	} = $props();

	const inspectionHintId = $props.id();
	let definition = $derived(comparisonMetric(metric));
	let rows = $derived(comparisonChartRows(data, regions, metric, basis, months));
	let visibleRows = $derived(visibleComparisonRows(rows, viewport));
	let ticks = $derived(comparisonTicks(visibleRows, months, 3));
	let domain = $derived(comparisonYDomain(rows, regions, viewport));
	let span = $derived(viewport.end - viewport.start);
	let units = $derived(comparisonChartUnits(metric));
	let unit = $derived(`${units.display}${units.baseUnit}`);
	let imageMetadata = $derived(
		JSON.stringify({
			hasData: visibleRows.some((row) => regions.some((id) => Number.isFinite(row[id]))),
			title: definition.shortLabel,
			unit,
			transform: '',
			legend: regions.map((id) => {
				const region = COMPARISON_REGIONS.find((r) => r.value === id);
				return { label: region?.label ?? id, colour: region?.colour ?? '#333333' };
			})
		})
	);

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

	/** The pointer inside the grid, anchoring the card's floating tooltip. */
	let pointer = $state(/** @type {{x: number, y: number} | null} */ (null));
	let width = $state(0);
	let height = $state(0);
	let inspected = $derived(hover ?? focus);
	/** @param {PointerEvent} event */
	function trackPointer(event) {
		const rect = /** @type {HTMLElement} */ (event.currentTarget).getBoundingClientRect();
		pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
	}
	/** @param {KeyboardEvent} event */
	function inspect(event) {
		if (event.target !== event.currentTarget) return;
		const step = inspectionStep(event.key, visibleRows, hover, focus);
		if (!step) return;
		if (event.key !== 'Escape') event.preventDefault();
		pointer = null;
		if ('hover' in step) onhover(step.hover ?? null);
		if ('focus' in step) onfocus(step.focus ?? null);
	}
</script>

<div
	role="group"
	aria-label={`${definition.label} panels`}
	class="relative"
	data-chart-image={imageMetadata}
>
	<div
		data-chart-area
		role="presentation"
		class="relative grid grid-cols-2 gap-x-4 gap-y-2 px-4 pt-2 md:grid-cols-3"
		bind:clientWidth={width}
		bind:clientHeight={height}
		onpointermove={trackPointer}
		onpointerleave={() => (pointer = null)}
	>
		{#each regions as region (region)}
			<RegionPanel
				{region}
				{regions}
				{rows}
				{metric}
				{viewport}
				{domain}
				{ticks}
				{hover}
				{focus}
				highlighted={hoverRegion === region}
				{onhover}
				{onfocus}
				{onhoverregion}
			/>
		{/each}
		{#if tooltip && inspected != null}
			<!-- Keyboard inspection has no pointer: the tooltip sits at the top left. -->
			<RegionTooltip
				period={comparisonPeriod(inspected, interval)}
				{unit}
				{regions}
				row={rows.find((row) => row.time === inspected)}
				{metric}
				hovered={hoverRegion}
				anchor={pointer ?? { x: 0, y: 0 }}
				{width}
				{height}
			/>
		{/if}
	</div>
	<div class="flex items-center justify-end gap-0.5 px-2" data-png-exclude>
		<StaticZoomButtons
			onzoomin={gestures.zoomIn}
			onzoomout={gestures.zoomOut}
			isAtMinZoom={span <= COMPARISON_MIN_SPAN_MS}
			isAtMaxZoom={viewport.start <= bounds.start && viewport.end >= bounds.end}
		/>
	</div>
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
