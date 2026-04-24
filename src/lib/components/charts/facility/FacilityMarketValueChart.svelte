<script>
	/**
	 * FacilityMarketValueChart — stacked-area chart of per-unit market value ($).
	 *
	 * Render-only consumer of `FacilityFinancialDataProvider` (via context).
	 * Hover/focus state is local (per-chart), all data / formatters / pan-zoom
	 * flow from context.
	 */

	import { StratumChart } from '$lib/components/charts/v2';
	import { getFacilityFinancialDataContext } from './FacilityFinancialDataContext.svelte.js';

	const ctx = getFacilityFinancialDataContext();

	/** @type {HTMLDivElement | undefined} */
	let containerEl = $state(undefined);

	$effect(() => {
		const el = containerEl;
		if (!el || !ctx) return;
		const onWheel = ctx.handleWheel;
		el.addEventListener('wheel', onWheel, { passive: false });
		return () => el.removeEventListener('wheel', onWheel);
	});

	/**
	 * @param {number} time
	 * @param {string} [key]
	 */
	function handleHover(time, key) {
		ctx?.mvChartStore?.setHover(time, key);
		ctx?.onhoverchange?.(time);
	}

	function handleHoverEnd() {
		ctx?.mvChartStore?.clearHover();
		ctx?.onhoverchange?.(undefined);
	}

	/** @param {number} time */
	function handleFocus(time) {
		ctx?.mvChartStore?.toggleFocus(time);
	}

	let mvChartStore = $derived(ctx?.mvChartStore ?? null);
	let viewStart = $derived(ctx?.viewStart ?? 0);
	let viewEnd = $derived(ctx?.viewEnd ?? 0);
	let hasViewportHandler = $derived(ctx?.hasViewportHandler ?? false);
	let loadingRanges = $derived(ctx?.mvLoadingRanges ?? []);
	let showLoadingOverlay = $derived(ctx?.showLoadingOverlay ?? false);

	// Mirror externally-driven hover time into the local chart store. Only
	// active when a parent has opted in via `onhoverchange` — otherwise the
	// effect would clear the hover that the user's own handler just set.
	$effect(() => {
		if (!ctx?.onhoverchange) return;
		const t = ctx.hoverTime;
		const store = mvChartStore;
		if (!store) return;
		if (store.hoverTime === t) return;
		if (t === undefined) {
			store.clearHover();
		} else {
			store.setHover(t);
		}
	});
</script>

{#if ctx && mvChartStore}
	<div
		bind:this={containerEl}
		class="rounded-lg p-4 relative bg-white"
	>
		<StratumChart
			chart={mvChartStore}
			onhover={handleHover}
			onhoverend={handleHoverEnd}
			onfocus={handleFocus}
			enablePan={hasViewportHandler}
			viewDomain={[viewStart, viewEnd]}
			onpanstart={ctx.handlePanStart}
			onpan={ctx.handlePan}
			onpanend={ctx.handlePanEnd}
			onzoom={ctx.handleZoom}
			{loadingRanges}
			tooltipMode="floating"
			resizable
			heightStorageKey="facility-chart-height-market-value"
			minHeight={120}
			maxHeight={700}
		>
			{#snippet tooltip()}
				{@const tip = ctx.getTooltipData(mvChartStore)}
				<div class="h-[21px]">
					{#if tip}
						<div class="h-full flex items-center justify-end text-xs">
							<span class="px-3 py-1 font-light bg-white/40">{tip.date}</span>
							<div class="bg-light-warm-grey px-4 py-1 flex gap-4 items-center">
								{#if tip.value !== undefined && tip.key}
									<div class="flex items-center gap-2">
										<span class="w-2.5 h-2.5 rounded-sm" style="background-color: {tip.colour}"
										></span>
										<span class="text-mid-grey">{tip.label}</span>
										<strong class="font-semibold"
											>{ctx.formatDollarValue(mvChartStore, tip.value)}</strong
										>
									</div>
								{/if}
								{#if mvChartStore.chartTooltips.showTotal}
									<span class="flex items-center gap-2">
										<span class="text-mid-grey">Total</span>
										<strong class="font-semibold"
											>{ctx.formatDollarValue(mvChartStore, tip.total)}</strong
										>
									</span>
								{/if}
							</div>
						</div>
					{/if}
				</div>
			{/snippet}
		</StratumChart>

		{#if showLoadingOverlay}
			<div class="absolute inset-0 flex items-center justify-center bg-white/60 rounded-lg">
				<div class="flex items-center gap-3 text-mid-warm-grey">
					<svg
						class="animate-spin h-4 w-4"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<span class="text-xs">Loading financial data...</span>
				</div>
			</div>
		{/if}
	</div>
{:else}
	<div
		class="border border-light-warm-grey rounded-lg bg-light-warm-grey/30 flex items-center justify-center h-[200px]"
	>
		<span class="text-xs text-mid-warm-grey">Loading…</span>
	</div>
{/if}
