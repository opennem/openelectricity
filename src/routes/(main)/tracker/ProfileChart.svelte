<script>
	import { onDestroy } from 'svelte';
	import { ChartStore, StratumChart } from '$lib/components/charts/v2';
	import { createViewportGestures } from '$lib/components/charts/v2/viewport-gestures.js';
	import {
		PROFILE_DAY_START,
		PROFILE_DAY_END,
		PROFILE_SLOT_MS,
		profileClock,
		profileTicks,
		clampProfileViewport
	} from './profile-chart.js';

	/** @type {{rows: any[], names: string[], labels: Record<string,string>, colours: Record<string,string>, title: string, zone: string, stacked?: boolean, price?: boolean}} */
	let { rows, names, labels, colours, title, zone, stacked = false, price = false } = $props();
	let viewport = $state.raw({ start: PROFILE_DAY_START, end: PROFILE_DAY_END });
	let engaged = $state(false);
	let chart = $derived.by(() => {
		const next = new ChartStore({
			key: Symbol('time-of-day'),
			title,
			prefix: price ? '' : 'M',
			displayPrefix: price ? '' : 'M',
			allowedPrefixes: price ? [] : ['M', 'G'],
			baseUnit: price ? '$/MWh' : 'W',
			timeZone: 'UTC',
			chartType: stacked ? 'stacked-area' : 'line',
			hideDataOptions: true,
			hideChartTypeOptions: true
		});
		next.seriesData = rows;
		next.seriesNames = names;
		next.seriesLabels = labels;
		next.seriesColours = colours;
		// Match the main generation chart: negative power pulls the cumulative
		// stack down. Average power uses its smooth curve, price remains stepped.
		next.useDivergingStack = false;
		next.chartOptions.selectedCurveType = price ? 'step' : 'smooth';
		next.chartStyles.chartHeightPx = 300;
		next.chartStyles.snapTicks = true;
		next.chartStyles.chartPadding = { top: 12, bottom: 28, left: 0, right: 0 };
		next.chartTooltips.showTotal = false;
		next.maximumFractionDigits = 1;
		next.formatTickX = profileClock;
		next.formatTooltipX = (date) =>
			`${profileClock(date)}–${profileClock(Number(date) + PROFILE_SLOT_MS)} · UTC${zone}`;
		return next;
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
	function reset() {
		engaged = false;
		viewport = { start: PROFILE_DAY_START, end: PROFILE_DAY_END };
		chart.clearFocus();
		chart.clearHover();
	}
	/** @param {KeyboardEvent} event */
	function inspectKey(event) {
		if (event.target !== event.currentTarget) return;
		const current = chart.hoverTime ?? chart.focusTime ?? viewport.start;
		if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
			event.preventDefault();
			const time = Math.max(
				viewport.start,
				Math.min(
					viewport.end - PROFILE_SLOT_MS,
					current + (event.key === 'ArrowRight' ? PROFILE_SLOT_MS : -PROFILE_SLOT_MS)
				)
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

<div
	role="group"
	aria-label={`${title} interactive chart`}
	class="mt-3"
	data-tracker-png={JSON.stringify({
		id: stacked ? 'profile-stack' : 'profile',
		label: title,
		ready: true,
		caption: `${profileClock(viewport.start)}–${profileClock(viewport.end)}`
	})}
>
	<StratumChart
		{chart}
		tooltipMode="floating"
		enablePan
		panZoomMode="tap-to-engage"
		bind:engaged
		viewDomain={[viewport.start, viewport.end]}
		zoomMode="static"
		resizable
		onpanstart={gestures.handlePanStart}
		onpan={gestures.handlePan}
		onpanend={gestures.handlePanEnd}
		onzoom={gestures.handleZoom}
		onzoomin={gestures.zoomIn}
		onzoomout={gestures.zoomOut}
		isAtMinZoom={viewport.end - viewport.start <= 3_600_000}
		isAtMaxZoom={viewport.end - viewport.start >= 86_400_000}
	/>
</div>
<div class="mt-2 flex flex-wrap items-center gap-2 text-xs" aria-label={`${title} legend`}>
	{#each names as name (name)}
		<button
			class="flex items-center gap-2 rounded border border-warm-grey px-2 py-1.5 aria-pressed:font-semibold"
			aria-pressed={!chart.hiddenSeriesNames.includes(name)}
			onclick={(event) => chart.toggleSeriesVisibility(name, event.metaKey || event.ctrlKey)}
		>
			<span class="size-3 rounded-sm" style:background={colours[name]}></span>{labels[name] ?? name}
		</button>
	{/each}
	<button
		class="ml-auto rounded border border-warm-grey px-2 py-1.5"
		onkeydown={inspectKey}
		onclick={() => chart.setHover(viewport.start)}>Inspect values</button
	>
	<button class="rounded border border-warm-grey px-2 py-1.5" onclick={reset}>Reset day view</button
	>
</div>
<p class="mt-2 text-xs text-mid-grey">
	Hover to inspect; click to pin. Focus “Inspect values” and use arrow keys to inspect, Enter to
	pin, Escape to clear. Click legend items to show/hide; Ctrl/⌘-click to solo.
</p>
