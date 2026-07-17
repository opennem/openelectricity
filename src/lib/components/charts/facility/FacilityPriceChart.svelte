<script>
	/**
	 * FacilityPriceChart — derived $/MWh line chart.
	 *
	 * Render-only consumer: all state (chart store, formatters, viewport, pan/
	 * zoom handlers) comes from `FacilityFinancialDataProvider` via context.
	 * Hover/focus state is local since it's per-chart.
	 */

	import { StratumChart } from '$lib/components/charts/v2';
	import { getFacilityFinancialDataContext } from './FacilityFinancialDataContext.svelte.js';

	/** @type {{ showContainer?: boolean, showHeader?: boolean, zoomMode?: 'floating' | 'static' | 'none', panZoomMode?: 'always' | 'tap-to-engage', panZoomEngaged?: boolean, showPanZoomHint?: boolean, resizable?: boolean }} */
	let {
		showContainer = true,
		showHeader = true,
		zoomMode = 'static',
		panZoomMode = 'always',
		panZoomEngaged = $bindable(false),
		showPanZoomHint = true,
		resizable = true
	} = $props();

	const ctx = getFacilityFinancialDataContext();

	/**
	 * @param {number} time
	 * @param {string} [key]
	 */
	function handleHover(time, key) {
		ctx?.priceChartStore?.setHover(time, key);
		ctx?.onhoverchange?.(time);
	}

	function handleHoverEnd() {
		ctx?.priceChartStore?.clearHover();
		ctx?.onhoverchange?.(undefined);
	}

	/** @param {number} time */
	function handleFocus(time) {
		ctx?.priceChartStore?.toggleFocus(time);
		ctx?.onfocuschange?.(ctx?.priceChartStore?.focusTime);
	}

	// Destructure reactive getters at render time
	let priceChartStore = $derived(ctx?.priceChartStore ?? null);
	let viewStart = $derived(ctx?.viewStart ?? 0);
	let viewEnd = $derived(ctx?.viewEnd ?? 0);
	let hasViewportHandler = $derived(ctx?.hasViewportHandler ?? false);
	let loadingRanges = $derived(ctx?.priceLoadingRanges ?? []);

	// Mirror externally-driven hover time into the local chart store. Only
	// active when a parent has opted in via `onhoverchange` — otherwise the
	// effect would clear the hover that the user's own handler just set.
	$effect(() => {
		if (!ctx?.onhoverchange) return;
		const t = ctx.hoverTime;
		const store = priceChartStore;
		if (!store) return;
		if (store.hoverTime === t) return;
		if (t === undefined) {
			store.clearHover();
		} else {
			store.setHover(t);
		}
	});

	// Mirror externally-driven focus time into the local chart store (same gating
	// as the hover effect above).
	$effect(() => {
		if (!ctx?.onfocuschange) return;
		const t = ctx.focusTime;
		const store = priceChartStore;
		if (!store) return;
		if (store.focusTime === t) return;
		if (t === undefined) {
			store.clearFocus();
		} else {
			store.setFocus(t);
		}
	});
</script>

{#if ctx && priceChartStore}
	<div class="group relative {showContainer ? 'rounded-lg p-4 bg-white' : ''}">
		<StratumChart
			chart={priceChartStore}
			{showHeader}
			onhover={handleHover}
			onhoverend={handleHoverEnd}
			onfocus={handleFocus}
			enablePan={hasViewportHandler}
			{panZoomMode}
			bind:engaged={panZoomEngaged}
			{showPanZoomHint}
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
			{resizable}
			heightStorageKey="facility-chart-height-market"
			minHeight={120}
			maxHeight={700}
		>
			{#snippet tooltip()}
				{@const tip = ctx.getTooltipData(priceChartStore)}
				{@const multiLine = priceChartStore.seriesNames.length > 1}
				<div class="h-[21px]">
					{#if tip}
						<div class="h-full flex items-center justify-end text-xs">
							<span class="px-3 py-1 font-light bg-white/40">{tip.date}</span>
							<!-- One entry per direction line — the lines are independent
							     $/MWh measures, so there is deliberately no total. -->
							<div class="bg-light-warm-grey px-4 py-1 flex gap-4 items-center">
								{#each priceChartStore.seriesNames as name (name)}
									{@const value = tip.data?.[name]}
									{#if value != null}
										<span class="flex items-center gap-1.5">
											{#if multiLine}
												<span
													class="inline-block size-2 shrink-0 rounded-full"
													style="background-color: {priceChartStore.seriesColours[name]};"
												></span>
											{/if}
											<span class="text-mid-grey">
												{(priceChartStore.seriesLabels[name] ?? name).replace(' ($/MWh)', '')}
											</span>
											<strong class="font-semibold">{ctx.formatPriceValue(value)}/MWh</strong>
										</span>
									{/if}
								{/each}
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
