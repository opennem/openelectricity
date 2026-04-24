<script>
	/**
	 * FacilityPriceChart — derived $/MWh line chart.
	 *
	 * Render-only consumer: all state (chart store, formatters, viewport, pan/
	 * zoom handlers) comes from `FacilityFinancialDataProvider` via context.
	 * Hover/focus state is local since it's per-chart.
	 */

	import { StratumChart } from '$lib/components/charts/v2';
	import { untrack } from 'svelte';
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
		ctx?.priceChartStore?.setHover(time, key);
	}

	function handleHoverEnd() {
		ctx?.priceChartStore?.clearHover();
	}

	/** @param {number} time */
	function handleFocus(time) {
		ctx?.priceChartStore?.toggleFocus(time);
	}

	// Destructure reactive getters at render time
	let priceChartStore = $derived(ctx?.priceChartStore ?? null);
	let viewStart = $derived(ctx?.viewStart ?? 0);
	let viewEnd = $derived(ctx?.viewEnd ?? 0);
	let hasViewportHandler = $derived(ctx?.hasViewportHandler ?? false);
	let loadingRanges = $derived(ctx?.priceLoadingRanges ?? []);

	// Suppress unused warnings — these are captured via context closures
	untrack(() => ctx);
</script>

{#if ctx && priceChartStore}
	<div
		bind:this={containerEl}
		class="border border-light-warm-grey rounded-lg p-4 relative bg-white"
	>
		<StratumChart
			chart={priceChartStore}
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
			resizable
			heightStorageKey="facility-chart-height-price"
			minHeight={100}
			maxHeight={600}
		>
			{#snippet tooltip()}
				{@const tip = ctx.getTooltipData(priceChartStore)}
				<div class="h-[21px]">
					{#if tip}
						<div class="h-full flex items-center justify-end text-xs">
							<span class="px-3 py-1 font-light bg-white/40">{tip.date}</span>
							<div class="bg-light-warm-grey px-4 py-1 flex gap-4 items-center">
								<span class="text-mid-grey">Av. Price</span>
								<strong class="font-semibold">{ctx.formatPriceValue(tip.total)}/MWh</strong>
							</div>
						</div>
					{/if}
				</div>
			{/snippet}
		</StratumChart>
	</div>
{:else}
	<div
		class="border border-light-warm-grey rounded-lg bg-light-warm-grey/30 flex items-center justify-center h-[150px]"
	>
		<span class="text-xs text-mid-warm-grey">Loading…</span>
	</div>
{/if}
