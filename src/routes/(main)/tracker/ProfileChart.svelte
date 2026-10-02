<script>
	import { onDestroy, untrack } from 'svelte';
	import { color as d3Colour } from 'd3-color';
	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { createViewportGestures } from '$lib/components/charts/v2/viewport-gestures.js';
	import { getFormattedX, getFormattedY } from '$lib/components/charts/v2/tooltip-derivations.js';
	import {
		PROFILE_DAY_START,
		PROFILE_DAY_END,
		profileClock,
		profileTicks,
		clampProfileViewport
	} from './profile-chart.js';

	/** A profile on the synthetic day, as the stacked view draws it: the
	 * all-technology average-day stack, or (Breakdown → Multi-line) one series'
	 * average area with its days, dark average and today as `overlays` lines.
	 * `title` heads the chart's options bar (the metric, as in Timeline's cards);
	 * `label` names the chart for assistive technology (its card's subject).
	 * `price` (fixed for the instance) switches units to $/MWh on a stepped curve.
	 * `readout` replaces the tooltip strip's single hovered value with the
	 * listed values of the inspected row (the percentile bands' real levels,
	 * rather than the stacked band thicknesses).
	 * `onhoverchange` reports this chart's hover (undefined when it ends) and
	 * `syncHoverTime` mirrors the shared hover onto it, so sibling charts track
	 * one slot, as Timeline's cards do.
	 * `onhoverkeychange` reports the series area or `hoverable` overlay line
	 * under the pointer (undefined once it leaves), and `activeKey` emphasises
	 * one, as sibling cards share it: other series fade, and an overlay thickens.
	 * @type {{rows: any[], names: string[], labels: Record<string,string>, colours: Record<string,string>,
	 * title: string, label: string, heightPx: number, slotMs: number, hiddenSeriesNames?: string[],
	 * overlays?: Array<{id: string, colour: string, strokeWidth?: number, label?: string, hoverable?: boolean}>,
	 * price?: boolean, engaged?: boolean,
	 * readout?: (row: Record<string, any>) => Array<{label: string, value: number | null, colour: string}>,
	 * syncHoverTime?: number, onhoverchange?: (time: number | undefined) => void,
	 * activeKey?: string | null, onhoverkeychange?: (key: string | undefined) => void}} */
	let {
		rows,
		names,
		labels,
		colours,
		title,
		label,
		heightPx,
		slotMs,
		hiddenSeriesNames = [],
		overlays = [],
		price = false,
		readout = undefined,
		syncHoverTime = undefined,
		onhoverchange = undefined,
		activeKey = null,
		onhoverkeychange = undefined,
		engaged = $bindable(false)
	} = $props();
	let viewport = $state.raw({ start: PROFILE_DAY_START, end: PROFILE_DAY_END });
	const inspectionHintId = $props.id();
	// One store for the component's life; data, labels and the window sync into
	// it, keeping the user's unit choice and pinned slot across changes.
	const isPrice = untrack(() => price);
	const chart = new ChartStore({
		key: Symbol('time-of-day'),
		title: untrack(() => title),
		prefix: isPrice ? '' : 'M',
		displayPrefix: isPrice ? '' : 'M',
		allowedPrefixes: isPrice ? [] : ['M', 'G'],
		baseUnit: isPrice ? '$/MWh' : 'W',
		timeZone: 'UTC',
		chartType: 'stacked-area',
		hideDataOptions: true,
		hideChartTypeOptions: true
	});
	// Match the main generation chart: negative power pulls the cumulative
	// stack down, on a smooth average-power curve; price stays stepped.
	chart.useDivergingStack = false;
	chart.chartOptions.selectedCurveType = isPrice ? 'step' : 'smooth';
	chart.chartStyles.snapTicks = true;
	chart.chartStyles.chartPadding = { top: 12, bottom: 28, left: 0, right: 0 };
	chart.chartTooltips.showTotal = false;
	chart.maximumFractionDigits = 1;
	chart.formatTickX = profileClock;
	/** A faded series, while another is the active one. @param {string} colour */
	function recede(colour) {
		const fill = d3Colour(colour);
		if (!fill) return colour;
		fill.opacity *= 0.4;
		return fill.toString();
	}
	let activeSeries = $derived(activeKey !== null && names.includes(activeKey));
	$effect(() => {
		chart.title = title;
		chart.seriesData = rows;
		chart.seriesNames = names;
		chart.seriesLabels = labels;
		chart.hiddenSeriesNames = hiddenSeriesNames;
		chart.formatTooltipX = (date) => `${profileClock(date)}–${profileClock(Number(date) + slotMs)}`;
	});
	// Colours and lines follow the shared active key too, apart from the data.
	$effect(() => {
		chart.seriesColours = activeSeries
			? Object.fromEntries(
					Object.entries(colours).map(([key, colour]) => [
						key,
						key === activeKey ? colour : recede(colour)
					])
				)
			: colours;
		chart.overlayLines = overlays.map(
			({ id, colour, strokeWidth = 1.5, label: name, hoverable }) => ({
				id,
				data: rows,
				valueKey: id,
				colour,
				strokeWidth: id === activeKey ? strokeWidth + 1.5 : strokeWidth,
				hoverable,
				label: name ?? id
			})
		);
	});
	// Mirror the shared hover from sibling charts onto this one. Its own hover is
	// already set by the interaction layer, so the echo is a no-op.
	$effect(() => {
		const time = syncHoverTime;
		if (!onhoverchange || untrack(() => chart.hoverTime) === time) return;
		if (time === undefined) chart.clearHover();
		else chart.setHover(time);
	});
	// The card owns the height, so resizing keeps the store and its pinned slot.
	$effect(() => {
		chart.chartStyles.chartHeightPx = heightPx;
	});
	// Adapt the bounded profile viewport to Stratum's interval-start step domain.
	$effect(() => {
		chart.setXDomain(viewport.start, viewport.end - (chart.stepIntervalMs || 0));
		const ticks = profileTicks(viewport.start, viewport.end);
		chart.xTicks = ticks;
		chart.xGridlineTicks = ticks;
		chart.xMobileHiddenTicks = ticks.filter((_, index) => index % 2 === 1);
	});
	const gestures = createViewportGestures({
		viewport: () => viewport,
		apply: (start, end) => {
			viewport = clampProfileViewport(start, end);
		},
		minDateMs: () => PROFILE_DAY_START,
		minDurationMs: () => 3_600_000,
		maxDurationMs: () => 86_400_000,
		onGestureStart: () => chart.clearHover()
	});
	onDestroy(gestures.dispose);
	/** The hovered or pinned half-hour, for the fuel-tech table and range readout. */
	export function getInspectTime() {
		return /** @type {number | undefined} */ (chart.hoverTime ?? chart.focusTime);
	}
	/** The visible clock window, captioning PNG exports. */
	export function getCaption() {
		return `${profileClock(viewport.start)}–${profileClock(viewport.end)}`;
	}
	/** @param {KeyboardEvent} event */
	function inspectKey(event) {
		if (event.target !== event.currentTarget) return;
		const current = chart.hoverTime ?? chart.focusTime ?? viewport.start;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			event.preventDefault();
			const time = Math.max(
				viewport.start,
				Math.min(viewport.end - slotMs, current + (event.key === 'ArrowRight' ? slotMs : -slotMs))
			);
			chart.setHover(time);
		} else if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			chart.toggleFocus(current);
		} else if (event.key === 'Escape') {
			chart.clearFocus();
			chart.clearHover();
		}
	}
</script>

{#snippet readoutStrip()}
	{@const row = chart.hoverData ?? chart.focusData}
	<div data-testid="chart-tooltip-strip" class="readout">
		{#if row && readout}
			<span class="bg-white/40 px-3 py-1 font-light">{getFormattedX(chart, row)}</span>
			<span class="flex flex-wrap items-center justify-end gap-x-3 bg-light-warm-grey px-2 py-1">
				{#each readout(row) as item (item.label)}
					<span class="flex items-center gap-1.5 whitespace-nowrap">
						<span class="size-2.5 rounded-sm" style:background-color={item.colour}></span>
						<span class="text-mid-grey">{item.label}</span>
						<strong class="font-semibold"
							>{item.value === null
								? '—'
								: `${getFormattedY(chart, item.value)} ${chart.tooltipUnit}`}</strong
						>
					</span>
				{/each}
			</span>
		{/if}
	</div>
{/snippet}

<!-- The breakdown lives in the fuel-tech table, so the stack takes Timeline's strip. -->
<div role="group" aria-label={`${label} interactive chart`} class="relative">
	<StratumChart
		{chart}
		onhover={(time, key) => {
			onhoverchange?.(time);
			// Only a series area or hoverable line names a key; the plot's own
			// hover keeps the last one until that path reports leaving.
			if (key !== undefined) onhoverkeychange?.(key);
		}}
		onhoverend={() => {
			onhoverchange?.(undefined);
			onhoverkeychange?.(undefined);
		}}
		tooltipMode="strip"
		tooltip={readout ? readoutStrip : undefined}
		enablePan
		panZoomMode="tap-to-engage"
		bind:engaged
		viewDomain={[viewport.start, viewport.end]}
		zoomMode="static"
		onpanstart={gestures.handlePanStart}
		onpan={gestures.handlePan}
		onpanend={gestures.handlePanEnd}
		onzoom={gestures.handleZoom}
		onzoomin={gestures.zoomIn}
		onzoomout={gestures.zoomOut}
		isAtMinZoom={viewport.end - viewport.start <= 3_600_000}
		isAtMaxZoom={viewport.end - viewport.start >= 86_400_000}
	/>
	<button
		type="button"
		class="sr-only focus:not-sr-only focus:absolute focus:bottom-2 focus:left-2 focus:z-30 rounded border border-mid-warm-grey bg-white px-3 py-2 text-xs focus:outline focus:outline-dark-grey"
		onkeydown={inspectKey}
		onclick={() => chart.setHover(viewport.start)}
		aria-label={`Inspect ${label.toLowerCase()} values`}
		aria-describedby={inspectionHintId}>Inspect values</button
	>
	<span id={inspectionHintId} class="sr-only"
		>Use left and right arrows to inspect a time slot, Enter to pin it, and Escape to clear it.</span
	>
</div>

<style>
	/* Two lines' height always, so a wrapping readout never shifts the plot. */
	.readout {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		min-height: 42px;
		font-size: var(--text-xs);
	}
</style>
