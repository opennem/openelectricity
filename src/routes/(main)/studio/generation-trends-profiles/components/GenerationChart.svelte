<script>
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import GenerationDataTable from '$lib/components/GenerationDataTable.svelte';
	import ButtonGroup from '$lib/components/ButtonGroup.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {Object} chartContext - Chart context for the chart
	 * @property {Object} [tableData] - Processed data for table display (for combined/cumulative)
	 * @property {Object} [fuelData] - Original fuel data (for individual charts)
	 * @property {string} [fuelTechName] - Fuel tech name (for individual charts)
	 * @property {string[]} [selectedFuelTechs] - Currently selected fuel technologies (for combined/cumulative)
	 * @property {string} viewState - Current view state ('chart' or 'table')
	 * @property {Function} onViewStateChange - Callback for view state changes
	 * @property {Function} onmousemove - Mouse move handler for chart interactions
	 * @property {Function} onmouseout - Mouse out handler for chart interactions
	 * @property {Function} onpointerup - Pointer up handler for chart interactions
	 * @property {string} [emptyStateMessage] - Message to show when no data available
	 * @property {string} [tooltipSuffix] - Additional text for tooltip (e.g., "(cumulative)")
	 */

	/** @type {Props} */
	let {
		chartContext,
		tableData,
		fuelData,
		fuelTechName,
		selectedFuelTechs,
		viewState,
		onViewStateChange,
		onmousemove,
		onmouseout,
		onpointerup,
		emptyStateMessage = 'No data available',
		tooltipSuffix = ''
	} = $props();

	// Determine if this is an individual fuel tech chart or combined/cumulative
	let isIndividualChart = $derived(!!fuelData && !!fuelTechName);
	let hasData = $derived(
		isIndividualChart
			? fuelData?.data?.length > 0 && fuelData?.years?.length > 0
			: selectedFuelTechs?.length > 0
	);
</script>

<div class="bg-white border border-gray-200 rounded-lg p-6">
	<div class="flex justify-end items-center mb-6">
		<!-- Toggle between chart and table view -->
		<div class="flex-shrink-0">
			<ButtonGroup
				buttons={[
					{ label: 'Chart', value: 'chart' },
					{ label: 'Table', value: 'table' }
				]}
				selected={viewState}
				onclick={(e) => onViewStateChange(e.target.value)}
			/>
		</div>
	</div>

	<!-- Chart/Table Content -->
	{#if hasData}
		{#if viewState === 'table'}
			<!-- Table View -->
			{#if isIndividualChart}
				<GenerationDataTable {fuelData} {fuelTechName} />
			{:else}
				<GenerationDataTable
					processedData={tableData}
					{chartContext}
					title={chartContext?.title || 'Data'}
					subtitle={selectedFuelTechs
						? `For selected fuel technologies: ${selectedFuelTechs.join(', ')}`
						: ''}
				/>
			{/if}
		{:else if chartContext?.key}
			<!-- Chart View -->
			{#snippet customTooltips()}
				{@const cxt = chartContext}
				{@const useData = cxt?.hoverData || cxt?.focusData}
				{@const valueDate = useData ? useData.date || undefined : undefined}
				{@const cxtValueKey = cxt?.chartTooltips?.valueKey || cxt?.hoverKey}
				{@const valueKey = useData && cxtValueKey ? useData[cxtValueKey] || undefined : undefined}
				{@const convertedValue =
					valueKey || valueKey === 0 ? cxt?.convertAndFormatValue(valueKey) : ''}
				{@const hoverKeyLabel = cxtValueKey ? cxt?.seriesLabels?.[cxtValueKey] : ''}

				<div
					class="h-[21px]"
					style="padding-right: var(--pad-right); z-index: 10; position: relative;"
				>
					{#if useData && (valueKey || valueKey === 0)}
						<div class="h-full items-center flex justify-end text-xs leading-xs whitespace-nowrap">
							<div class="bg-light-warm-grey px-4 py-1 flex gap-4 items-center">
								<span class="font-semibold">
									{valueDate?.toLocaleDateString('en', { month: 'short' })}
									{hoverKeyLabel} — {convertedValue}
									{cxt?.chartOptions?.displayUnit}{tooltipSuffix}
								</span>
							</div>
						</div>
					{/if}
				</div>
			{/snippet}

			<LensChart
				cxtKey={chartContext?.key}
				displayOptions={true}
				showTooltip={false}
				{customTooltips}
				{onmousemove}
				{onmouseout}
				{onpointerup}
			/>
		{/if}
	{:else}
		<div class="text-center py-8 text-gray-500">
			<p>{emptyStateMessage}</p>
		</div>
	{/if}
</div>
