<script>
	/**
	 * Chart Tooltip Component
	 *
	 * Displays hover/focus information for the chart.
	 * Shows date, selected series value, and total.
	 */

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart - The chart store instance
	 * @property {string} [defaultText] - Text to show when nothing is hovered
	 * @property {string} [class] - Additional CSS classes
	 */

	/** @type {Props} */
	let { chart, defaultText = '', class: className = '' } = $props();

	// Use focus data if available, otherwise hover data
	let activeData = $derived(chart.hoverData || chart.focusData);

	// Get the value key (from tooltip config or hover key)
	let valueKey = $derived(chart.chartTooltips.valueKey || chart.hoverKey);

	// Get the value for the active key
	let value = $derived(
		activeData && valueKey !== undefined ? activeData[valueKey] : undefined
	);

	// Get total (sum of all visible series values)
	let total = $derived.by(() => {
		if (!activeData) return 0;
		return chart.visibleSeriesNames.reduce(
			(sum, name) => sum + (Number(activeData[name]) || 0),
			0
		);
	});

	// Format values
	let formattedValue = $derived(
		value !== undefined ? chart.convertAndFormatValue(Number(value)) : ''
	);
	let formattedTotal = $derived(chart.convertAndFormatValue(total));

	// Get colour for the active key
	let activeColour = $derived(valueKey ? chart.seriesColours[valueKey] : undefined);

	// Get label for the active key
	let activeLabel = $derived(valueKey ? chart.seriesLabels[valueKey] : undefined);

	// Format date
	let formattedDate = $derived.by(() => {
		if (!activeData?.date) return '';
		const date = activeData.date;
		return new Intl.DateTimeFormat('en-AU', {
			timeZone: chart.timeZone,
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	});
</script>

<div class="h-[21px] {className}">
	{#if activeData}
		<div class="h-full flex items-center justify-end text-xs">
			<!-- Date -->
			<span class="px-3 py-1 font-light bg-white/40">
				{formattedDate}
			</span>

			{#if value !== undefined || chart.chartTooltips.showTotal}
				<div class="bg-light-warm-grey px-4 py-1 flex gap-4 items-center">
					<!-- Selected series value -->
					{#if value !== undefined && valueKey}
						<div class="flex items-center gap-2">
							<span
								class="w-2.5 h-2.5 rounded-sm"
								style="background-color: {activeColour}"
							></span>
							<span class="text-mid-grey">{activeLabel}</span>
							<strong class="font-semibold">
								{formattedValue}
								{chart.chartOptions.displayUnit}
							</strong>
						</div>
					{/if}

					<!-- Total -->
					{#if chart.chartTooltips.showTotal}
						<span class="flex items-center gap-2">
							<span class="text-mid-grey">Total</span>
							<strong class="font-semibold">
								{formattedTotal}
								{chart.chartOptions.displayUnit}
							</strong>
						</span>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<div class="h-full flex items-center justify-end text-xs text-mid-grey">
			{defaultText}
		</div>
	{/if}
</div>
