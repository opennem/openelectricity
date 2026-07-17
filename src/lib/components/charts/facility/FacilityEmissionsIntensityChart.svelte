<script>
	/**
	 * FacilityEmissionsIntensityChart — derived kgCO₂e/MWh line chart.
	 *
	 * Render-only consumer: all state (chart store, formatters, viewport, pan/
	 * zoom handlers) comes from `FacilityEmissionsDataProvider` via context.
	 * Hover/focus state is local since it's per-chart.
	 */

	import { StratumChart } from '$lib/components/charts/v2';
	import { getFacilityEmissionsDataContext } from './FacilityEmissionsDataContext.svelte.js';

	/** @type {{ showContainer?: boolean, zoomMode?: 'floating' | 'static' | 'none', panZoomMode?: 'always' | 'tap-to-engage', panZoomEngaged?: boolean }} */
	let {
		showContainer = true,
		zoomMode = 'static',
		panZoomMode = 'always',
		panZoomEngaged = $bindable(false)
	} = $props();

	const ctx = getFacilityEmissionsDataContext();

	/**
	 * @param {number} time
	 * @param {string} [key]
	 */
	function handleHover(time, key) {
		ctx?.intensityChartStore?.setHover(time, key);
		ctx?.onhoverchange?.(time);
	}

	function handleHoverEnd() {
		ctx?.intensityChartStore?.clearHover();
		ctx?.onhoverchange?.(undefined);
	}

	/** @param {number} time */
	function handleFocus(time) {
		ctx?.intensityChartStore?.toggleFocus(time);
	}

	// Destructure reactive getters at render time
	let intensityChartStore = $derived(ctx?.intensityChartStore ?? null);
	let viewStart = $derived(ctx?.viewStart ?? 0);
	let viewEnd = $derived(ctx?.viewEnd ?? 0);
	let hasViewportHandler = $derived(ctx?.hasViewportHandler ?? false);
	let loadingRanges = $derived(ctx?.intensityLoadingRanges ?? []);

	// Mirror externally-driven hover time into the local chart store. Only
	// active when a parent has opted in via `onhoverchange` — otherwise the
	// effect would clear the hover that the user's own handler just set.
	$effect(() => {
		if (!ctx?.onhoverchange) return;
		const t = ctx.hoverTime;
		const store = intensityChartStore;
		if (!store) return;
		if (store.hoverTime === t) return;
		if (t === undefined) {
			store.clearHover();
		} else {
			store.setHover(t);
		}
	});
</script>

{#if ctx && intensityChartStore}
	<div class="group relative {showContainer ? 'rounded-lg p-4 bg-white' : ''}">
		<StratumChart
			chart={intensityChartStore}
			onhover={handleHover}
			onhoverend={handleHoverEnd}
			onfocus={handleFocus}
			enablePan={hasViewportHandler}
			{panZoomMode}
			bind:engaged={panZoomEngaged}
			viewDomain={null}
			onpanstart={ctx.handlePanStart}
			onpan={ctx.handlePan}
			onpanend={ctx.handlePanEnd}
			onzoom={ctx.handleZoom}
			{loadingRanges}
			tooltipMode="floating"
			zoomMode={hasViewportHandler ? zoomMode : 'none'}
			onzoomin={ctx.zoomIn}
			onzoomout={ctx.zoomOut}
			isAtMinZoom={ctx.isAtMinZoom}
			isAtMaxZoom={ctx.isAtMaxZoom}
			resizable
			heightStorageKey="facility-chart-height-emissions"
			minHeight={120}
			maxHeight={700}
		>
			{#snippet tooltip()}
				{@const tip = ctx.getTooltipData(intensityChartStore)}
				<div class="h-[21px]">
					{#if tip}
						<div class="h-full flex items-center justify-end text-xs">
							<span class="px-3 py-1 font-light bg-white/40">{tip.date}</span>
							<div class="bg-light-warm-grey px-4 py-1 flex gap-4 items-center">
								<span class="text-mid-grey">Emissions Intensity</span>
								<strong class="font-semibold">{ctx.formatIntensityValue(tip.total)}</strong>
							</div>
						</div>
					{/if}
				</div>
			{/snippet}
		</StratumChart>
	</div>
{:else}
	<div
		class="border border-light-warm-grey rounded-lg bg-light-warm-grey/30 flex items-center justify-center h-[200px]"
	>
		<span class="text-xs text-mid-warm-grey">Loading…</span>
	</div>
{/if}
