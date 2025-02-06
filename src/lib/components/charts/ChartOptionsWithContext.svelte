<script>
	import getContext from '$lib/utils/get-context.js';
	import Switch from '$lib/components/Switch.svelte';

	/** @type {{ cxtKey: symbol }} */
	let { cxtKey } = $props();

	/** @type {import('$lib/components/charts/stores/chart.svelte.js').default} */
	let cxt = getContext(cxtKey);

	let unitOptions = $derived(
		cxt.chartOptions.allowedPrefixes.map((/** @type {string} */ prefix) => {
			return {
				label: `${prefix}${cxt.chartOptions.baseUnit}`,
				value: prefix
			};
		})
	);
</script>

<div class="grid grid-cols-5 gap-4 items-center">
	<span class="font-space font-semibold uppercase text-xs text-mid-grey">Data</span>
	<div class="col-span-4">
		<div class="flex gap-2">
			<Switch
				buttons={cxt.chartOptions.dataTransformOptions}
				selected={cxt.chartOptions.selectedDataTransformType}
				xPad={4}
				yPad={2}
				textSize="xs"
				on:change={(evt) => (cxt.chartOptions.selectedDataTransformType = evt.detail.value)}
			/>
		</div>
	</div>
</div>

<div class="grid grid-cols-5 gap-4 items-center">
	<span class="font-space font-semibold uppercase text-xs text-mid-grey">Chart</span>
	<div class="col-span-4">
		<Switch
			buttons={cxt.chartOptions.chartTypeOptions}
			selected={cxt.chartOptions.selectedChartType}
			xPad={4}
			yPad={2}
			textSize="xs"
			on:change={(evt) => (cxt.chartOptions.selectedChartType = evt.detail.value)}
		/>
	</div>
</div>

<div class="grid grid-cols-5 gap-4 items-center">
	<span class="font-space font-semibold uppercase text-xs text-mid-grey">Style</span>
	<div class="col-span-4">
		<Switch
			buttons={cxt.chartOptions.curveOptions}
			selected={cxt.chartOptions.selectedCurveType}
			xPad={4}
			yPad={2}
			textSize="xs"
			on:change={(evt) => (cxt.chartOptions.selectedCurveType = evt.detail.value)}
		/>
	</div>
</div>

{#if cxt.chartOptions.allowPrefixSwitch}
	<div class="grid grid-cols-5 gap-4 items-center">
		<span class="font-space font-semibold uppercase text-xs text-mid-grey">Units</span>
		<div class="col-span-4">
			<Switch
				buttons={unitOptions}
				selected={cxt.chartOptions.displayPrefix}
				xPad={4}
				yPad={2}
				textSize="xs"
				on:change={(evt) => (cxt.chartOptions.displayPrefix = evt.detail.value)}
			/>
		</div>
	</div>
{/if}
