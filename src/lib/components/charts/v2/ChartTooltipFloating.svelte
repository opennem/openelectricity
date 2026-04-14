<script>
	/**
	 * ChartTooltipFloating — cursor-following tooltip overlaid on the chart.
	 *
	 * Reads `chart.hoverTime` (set by InteractionLayer / StackedArea mouse
	 * events) and positions itself at the corresponding x-pixel inside the
	 * chart area, with boundary-aware flipping near the edges.
	 */

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart
	 * @property {number} [dodgeRightPx] - Width of a top-right UI element (e.g. zoom buttons) to dodge. If the tooltip's right edge would land inside the last `dodgeRightPx` pixels of the container, the tooltip drops down to avoid overlap.
	 * @property {number} [insetPx] - Horizontal gap (px) to keep between the tooltip card and both edges of the container. Useful when the chart is rendered full-bleed and you still want the overlay to stand off from the edges.
	 * @property {string} [class]
	 */

	/** @type {Props} */
	let { chart, dodgeRightPx = 0, insetPx = 0, class: className = '' } = $props();

	/** @type {HTMLDivElement | undefined} */
	let wrapperEl = $state(undefined);
	let wrapperWidth = $state(0);

	/** @type {HTMLDivElement | undefined} */
	let tooltipEl = $state(undefined);
	let tooltipWidth = $state(0);

	let activeData = $derived(chart.hoverData || chart.focusData);
	let valueKey = $derived(chart.chartTooltips.valueKey || chart.hoverKey);
	let value = $derived(activeData && valueKey !== undefined ? activeData[valueKey] : undefined);

	let total = $derived.by(() => {
		if (!activeData) return 0;
		return chart.visibleSeriesNames.reduce(
			(/** @type {number} */ sum, /** @type {string} */ name) =>
				sum + (Number(activeData[name]) || 0),
			0
		);
	});

	let formattedValue = $derived(
		value !== undefined ? chart.convertAndFormatValue(Number(value)) : ''
	);
	let formattedTotal = $derived(chart.convertAndFormatValue(total));
	let activeColour = $derived(valueKey ? chart.seriesColours[valueKey] : undefined);
	let activeLabel = $derived(valueKey ? chart.seriesLabels[valueKey] : undefined);

	let formattedDate = $derived.by(() => {
		if (!activeData) return '';
		if (chart.isCategoryChart) {
			const categoryValue = activeData[chart.xKey];
			if (categoryValue !== undefined) return chart.formatX(categoryValue);
			return '';
		}
		if (!activeData.date) return '';
		return new Intl.DateTimeFormat('en-AU', {
			timeZone: chart.timeZone,
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(activeData.date);
	});

	// Convert hoverTime → x-pixel in the chart area, accounting for padding.
	let hoverX = $derived.by(() => {
		if (!activeData || !wrapperWidth) return null;
		const domain = chart.xDomain;
		if (!domain || domain.length !== 2) return null;
		const [xMin, xMax] = domain;
		if (xMax === xMin) return null;
		const pad = chart.chartStyles.chartPadding || { left: 0, right: 0 };
		const drawLeft = pad.left || 0;
		const drawWidth = wrapperWidth - drawLeft - (pad.right || 0);
		if (drawWidth <= 0) return null;
		const ratio = (activeData.time - xMin) / (xMax - xMin);
		return drawLeft + ratio * drawWidth;
	});

	// Position tooltip horizontally, clamped within [insetPx, wrapperWidth - tooltipWidth - insetPx].
	let tooltipLeft = $derived.by(() => {
		if (hoverX === null || !tooltipWidth || !wrapperWidth) return 0;
		const halfTip = tooltipWidth / 2;
		const desired = hoverX - halfTip;
		return Math.max(insetPx, Math.min(wrapperWidth - tooltipWidth - insetPx, desired));
	});

	// Dodge a top-right UI element (e.g. zoom buttons). If the tooltip's right
	// edge lands inside the last `dodgeRightPx` of the container, drop it below.
	let tooltipTop = $derived.by(() => {
		if (dodgeRightPx <= 0) return 8;
		if (hoverX === null || !tooltipWidth || !wrapperWidth) return 8;
		const tooltipRight = tooltipLeft + tooltipWidth;
		const zoneLeft = wrapperWidth - dodgeRightPx;
		return tooltipRight > zoneLeft ? 20 : 8;
	});
</script>

<div
	bind:this={wrapperEl}
	bind:clientWidth={wrapperWidth}
	class="absolute inset-0 pointer-events-none z-20 {className}"
>
	{#if activeData}
		<!-- Vertical hover line -->
		{#if hoverX !== null}
			<div
				class="absolute top-0 bottom-0 w-px bg-mid-warm-grey/40"
				style:left="{hoverX}px"
			></div>
		{/if}

		<!-- Tooltip card -->
		<div
			bind:this={tooltipEl}
			bind:clientWidth={tooltipWidth}
			class="absolute flex items-center gap-3 px-3 py-1.5 bg-white/95 backdrop-blur-sm rounded-md shadow-sm border border-warm-grey text-xs whitespace-nowrap transition-[top] duration-150"
			style:left="{tooltipLeft}px"
			style:top="{tooltipTop}px"
		>
			<span class="font-light text-mid-grey">{formattedDate}</span>

			{#if value !== undefined}
				<span class="flex items-center gap-1.5">
					<span
						class="w-2 h-2 rounded-full shrink-0"
						style:background-color={activeColour}
					></span>
					<span class="text-dark-grey">{activeLabel}</span>
					<span class="font-mono font-medium text-dark-grey">{formattedValue}</span>
				</span>
			{/if}

			{#if chart.chartTooltips.showTotal}
				<span class="flex items-center gap-1.5 pl-3 border-l border-warm-grey">
					<span class="text-mid-grey">Total</span>
					<span class="font-mono font-medium text-dark-grey">{formattedTotal}</span>
				</span>
			{/if}
		</div>
	{/if}
</div>
