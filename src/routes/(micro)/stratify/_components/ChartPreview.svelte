<script>
	import StratifyPlotChart from '$lib/components/charts/plot/StratifyPlotChart.svelte';
	import { getStratifyContext } from '../_state/context.js';
	import { getPlotStyle } from '$lib/stratify/chart-styles.js';

	const project = getStratifyContext();

	let plotStyleOptions = $derived({ style: getPlotStyle(project.stylePreset) });
</script>

<div
	class="chart-preview flex flex-col gap-4"
	style="font-family: {project.activePreset.typography.fontFamily};"
>
	{#if project.title || project.description}
		<div class="space-y-1">
			{#if project.title}
				<h2
					class="text-dark-grey"
					style="font-size: {project.activePreset.typography.titleSize}; font-weight: {project
						.activePreset.typography.titleWeight};"
				>
					{project.title}
				</h2>
			{/if}
			{#if project.description}
				<p class="text-xs text-mid-grey">{project.description}</p>
			{/if}
		</div>
	{/if}

	<StratifyPlotChart
		data={project.visibleData}
		seriesNames={project.visibleSeriesNames}
		seriesColours={project.seriesColours}
		seriesLabels={project.seriesLabels}
		chartType={project.chartType}
		seriesChartTypes={project.seriesChartTypes}
		plotOverrides={project.plotOverrides}
		colourSeries={project.colourSeries}
		colourGroupNames={project.colourGroupNames}
		dataColumnLabels={project.dataColumnLabels}
		xLabel={project.xLabel}
		yLabel={project.yLabel}
		options={plotStyleOptions}
		height={project.chartHeight}
		xTicks={project.xTicks}
		xTickRotate={project.xTickRotate}
		marginBottom={project.marginBottom}
	/>

	{#if project.notes || project.dataSource}
		<div class="space-y-0.5">
			{#if project.dataSource}
				<p class="text-[10px] text-mid-grey">Source: {project.dataSource}</p>
			{/if}
			{#if project.notes}
				<p class="text-[10px] text-mid-grey">{project.notes}</p>
			{/if}
		</div>
	{/if}
</div>
