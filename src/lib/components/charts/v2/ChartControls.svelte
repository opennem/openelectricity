<script>
	/**
	 * Chart Controls Component
	 *
	 * Provides controls for data transform, chart type, curve style, and units.
	 * Displayed in a dropdown panel from the chart header.
	 */
	import Switch from '$lib/components/Switch.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart - The chart store instance
	 * @property {boolean} [showDataOptions] - Override to show/hide data transform options
	 * @property {boolean} [showChartTypeOptions] - Override to show/hide chart type options
	 * @property {boolean} [showCurveOptions] - Whether to show curve options
	 * @property {boolean} [showUnitOptions] - Whether to show unit options
	 */

	/** @type {Props} */
	let {
		chart,
		showDataOptions,
		showChartTypeOptions,
		showCurveOptions = true,
		showUnitOptions = true
	} = $props();

	// Use chart settings if not explicitly overridden
	let displayDataOptions = $derived(
		showDataOptions !== undefined ? showDataOptions : !chart.hideDataOptions
	);
	let displayChartTypeOptions = $derived(
		showChartTypeOptions !== undefined ? showChartTypeOptions : !chart.hideChartTypeOptions
	);

	let unitOptions = $derived(
		chart.chartOptions.allowedPrefixes.map((prefix) => ({
			label: `${prefix}${chart.chartOptions.baseUnit}`,
			value: prefix
		}))
	);

	// Create mutable copies of the readonly options arrays for the Switch component
	let dataTransformOptions = $derived([...chart.chartOptions.dataTransformOptions]);
	let chartTypeOptions = $derived([...chart.chartOptions.chartTypeOptions]);
	let curveOptions = $derived([...chart.chartOptions.curveOptions]);

	/**
	 * @param {string} type
	 */
	function handleDataTransformChange(type) {
		chart.chartOptions.selectedDataTransformType =
			/** @type {import('./ChartOptions.svelte.js').DataTransformType} */ (type);
	}

	/**
	 * @param {string} type
	 */
	function handleChartTypeChange(type) {
		chart.chartOptions.selectedChartType =
			/** @type {import('./ChartOptions.svelte.js').ChartType} */ (type);
	}

	/**
	 * @param {string} type
	 */
	function handleCurveTypeChange(type) {
		chart.chartOptions.selectedCurveType =
			/** @type {import('./ChartOptions.svelte.js').CurveType} */ (type);
	}

	/**
	 * @param {string} prefix
	 */
	function handleUnitChange(prefix) {
		chart.chartOptions.displayPrefix = /** @type {SiPrefix} */ (prefix);
	}
</script>

<div class="p-6 flex flex-col gap-4">
	{#if displayDataOptions}
		<div class="grid grid-cols-5 gap-4 items-center">
			<span class="font-space font-semibold uppercase text-xs text-mid-grey">Data</span>
			<div class="col-span-4">
				<Switch
					buttons={dataTransformOptions}
					selected={chart.chartOptions.selectedDataTransformType}
					onChange={handleDataTransformChange}
					xPad={4}
					yPad={2}
					textSize="xs"
				/>
			</div>
		</div>
	{/if}

	{#if displayChartTypeOptions}
		<div class="grid grid-cols-5 gap-4 items-center">
			<span class="font-space font-semibold uppercase text-xs text-mid-grey">Chart</span>
			<div class="col-span-4">
				<Switch
					buttons={chartTypeOptions}
					selected={chart.chartOptions.selectedChartType}
					onChange={handleChartTypeChange}
					xPad={4}
					yPad={2}
					textSize="xs"
				/>
			</div>
		</div>
	{/if}

	{#if showCurveOptions}
		<div class="grid grid-cols-5 gap-4 items-center">
			<span class="font-space font-semibold uppercase text-xs text-mid-grey">Style</span>
			<div class="col-span-4">
				<Switch
					buttons={curveOptions}
					selected={chart.chartOptions.selectedCurveType}
					onChange={handleCurveTypeChange}
					xPad={4}
					yPad={2}
					textSize="xs"
				/>
			</div>
		</div>
	{/if}

	{#if showUnitOptions && chart.chartOptions.allowPrefixSwitch}
		<div class="grid grid-cols-5 gap-4 items-center">
			<span class="font-space font-semibold uppercase text-xs text-mid-grey">Units</span>
			<div class="col-span-4">
				<Switch
					buttons={unitOptions}
					selected={chart.chartOptions.displayPrefix}
					onChange={handleUnitChange}
					xPad={4}
					yPad={2}
					textSize="xs"
				/>
			</div>
		</div>
	{/if}
</div>
