<script>
	import { getContext, onMount, onDestroy } from 'svelte';
	import Meta from '$lib/components/Meta.svelte';
	import StratifyPlotChart from '$lib/components/charts/plot/StratifyPlotChart.svelte';
	import { parseCSV } from '$lib/stratify/csv-parser.js';
	import { examples } from '../stratify/_utils/examples.js';

	const layout = getContext('layout-fullscreen');
	onMount(() => layout.setFullscreen(true));
	onDestroy(() => layout.setFullscreen(false));

	// Parse example data once
	const stackedAreaExample = examples.find((e) => e.chartType === 'stacked-area');
	const lineExample = examples.find((e) => e.chartType === 'line');
	const barStackedExample = examples.find((e) => e.chartType === 'bar-stacked');
	const groupedBarExample = examples.find((e) => e.chartType === 'grouped-bar');

	const stackedAreaData = stackedAreaExample ? parseCSV(stackedAreaExample.csvData) : null;
	const lineData = lineExample ? parseCSV(lineExample.csvData) : null;
	const barStackedData = barStackedExample ? parseCSV(barStackedExample.csvData) : null;
	const groupedBarData = groupedBarExample ? parseCSV(groupedBarExample.csvData) : null;

	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

<Meta title="StratifyPlotChart Docs" description="Interactive documentation for the Observable Plot chart system" />

{#if mounted}
	<div class="flex flex-col h-dvh overflow-hidden font-mono">
		<div
			class="flex items-center gap-3 px-4 py-2 border-b border-warm-grey bg-light-warm-grey/50"
		>
			<span class="text-[11px] font-medium text-dark-grey tracking-wide uppercase"
				>StratifyPlotChart Docs</span
			>
			<span class="text-[10px] text-mid-grey">Interactive documentation</span>
		</div>

		<div class="flex-1 min-h-0 overflow-y-auto p-6">
			<div class="max-w-5xl mx-auto space-y-12">
				<!-- ===== CHART TYPES ===== -->
				<section>
					<h2 class="text-lg font-semibold text-dark-grey mb-3">Chart Types</h2>

					<!-- Stacked Area -->
					{#if stackedAreaData}
						<div class="mb-12">
							<h3 class="text-[13px] font-medium text-dark-grey">Stacked Area</h3>
							<p class="text-[11px] text-mid-grey mt-1">
								Continuous time-series data stacked to show composition over time. Uses the AU
								electricity generation dataset.
							</p>
							<div class="border border-warm-grey rounded mt-2">
								<StratifyPlotChart
									data={stackedAreaData.data}
									seriesNames={stackedAreaData.seriesNames}
									seriesColours={stackedAreaData.seriesColours}
									seriesLabels={stackedAreaData.seriesLabels}
									chartType="stacked-area"
									height={280}
								/>
							</div>
							<pre
								class="bg-light-warm-grey text-[11px] p-4 rounded overflow-x-auto font-mono mt-2"><code>{`<StratifyPlotChart
  data={parsed.data}
  seriesNames={parsed.seriesNames}
  seriesColours={parsed.seriesColours}
  seriesLabels={parsed.seriesLabels}
  chartType="stacked-area"
  height={280}
/>`}</code></pre>
						</div>
					{/if}

					<!-- Line -->
					{#if lineData}
						<div class="mb-12">
							<h3 class="text-[13px] font-medium text-dark-grey">Line</h3>
							<p class="text-[11px] text-mid-grey mt-1">
								Multiple series rendered as individual lines. Uses the wholesale electricity prices
								dataset.
							</p>
							<div class="border border-warm-grey rounded mt-2">
								<StratifyPlotChart
									data={lineData.data}
									seriesNames={lineData.seriesNames}
									seriesColours={lineData.seriesColours}
									seriesLabels={lineData.seriesLabels}
									chartType="line"
									height={280}
								/>
							</div>
							<pre
								class="bg-light-warm-grey text-[11px] p-4 rounded overflow-x-auto font-mono mt-2"><code>{`<StratifyPlotChart
  data={parsed.data}
  seriesNames={parsed.seriesNames}
  seriesColours={parsed.seriesColours}
  seriesLabels={parsed.seriesLabels}
  chartType="line"
  height={280}
/>`}</code></pre>
						</div>
					{/if}

					<!-- Stacked Bar -->
					{#if barStackedData}
						<div class="mb-12">
							<h3 class="text-[13px] font-medium text-dark-grey">Stacked Bar</h3>
							<p class="text-[11px] text-mid-grey mt-1">
								Categorical data stacked within each bar. Uses the state capacity dataset.
							</p>
							<div class="border border-warm-grey rounded mt-2">
								<StratifyPlotChart
									data={barStackedData.data}
									seriesNames={barStackedData.seriesNames}
									seriesColours={barStackedData.seriesColours}
									seriesLabels={barStackedData.seriesLabels}
									chartType="bar-stacked"
									height={280}
								/>
							</div>
							<pre
								class="bg-light-warm-grey text-[11px] p-4 rounded overflow-x-auto font-mono mt-2"><code>{`<StratifyPlotChart
  data={parsed.data}
  seriesNames={parsed.seriesNames}
  seriesColours={parsed.seriesColours}
  seriesLabels={parsed.seriesLabels}
  chartType="bar-stacked"
  height={280}
/>`}</code></pre>
						</div>
					{/if}

					<!-- Grouped Bar -->
					{#if groupedBarData}
						<div class="mb-12">
							<h3 class="text-[13px] font-medium text-dark-grey">Grouped Bar</h3>
							<p class="text-[11px] text-mid-grey mt-1">
								Categorical data with series placed side-by-side for comparison. Uses the battery
								cycle rates dataset.
							</p>
							<div class="border border-warm-grey rounded mt-2">
								<StratifyPlotChart
									data={groupedBarData.data}
									seriesNames={groupedBarData.seriesNames}
									seriesColours={groupedBarData.seriesColours}
									seriesLabels={groupedBarData.seriesLabels}
									chartType="grouped-bar"
									height={280}
								/>
							</div>
							<pre
								class="bg-light-warm-grey text-[11px] p-4 rounded overflow-x-auto font-mono mt-2"><code>{`<StratifyPlotChart
  data={parsed.data}
  seriesNames={parsed.seriesNames}
  seriesColours={parsed.seriesColours}
  seriesLabels={parsed.seriesLabels}
  chartType="grouped-bar"
  height={280}
/>`}</code></pre>
						</div>
					{/if}
				</section>

				<!-- ===== ANNOTATIONS ===== -->
				<section>
					<h2 class="text-lg font-semibold text-dark-grey mb-3">Annotations</h2>

					<!-- End Labels -->
					{#if lineData}
						<div class="mb-12">
							<h3 class="text-[13px] font-medium text-dark-grey">End Labels</h3>
							<p class="text-[11px] text-mid-grey mt-1">
								Adds labels at the end of each line series for easy identification without a
								separate legend.
							</p>
							<div class="border border-warm-grey rounded mt-2">
								<StratifyPlotChart
									data={lineData.data}
									seriesNames={lineData.seriesNames}
									seriesColours={lineData.seriesColours}
									seriesLabels={lineData.seriesLabels}
									chartType="line"
									annotations={[{ type: 'end-labels' }]}
									height={280}
								/>
							</div>
							<pre
								class="bg-light-warm-grey text-[11px] p-4 rounded overflow-x-auto font-mono mt-2"><code>{`<StratifyPlotChart
  ...chartProps
  chartType="line"
  annotations={[{ type: 'end-labels' }]}
  height={280}
/>`}</code></pre>
						</div>
					{/if}

					<!-- X-Rule -->
					{#if stackedAreaData}
						<div class="mb-12">
							<h3 class="text-[13px] font-medium text-dark-grey">X-Rule</h3>
							<p class="text-[11px] text-mid-grey mt-1">
								Draws a vertical rule at a specific x-value with optional label. Useful for marking
								significant dates or events.
							</p>
							<div class="border border-warm-grey rounded mt-2">
								<StratifyPlotChart
									data={stackedAreaData.data}
									seriesNames={stackedAreaData.seriesNames}
									seriesColours={stackedAreaData.seriesColours}
									seriesLabels={stackedAreaData.seriesLabels}
									chartType="stacked-area"
									annotations={[
										{
											type: 'x-rule',
											x: '2024-04-01',
											text: 'Bushfires',
											style: { lineStyle: 'dotted' }
										}
									]}
									height={280}
								/>
							</div>
							<pre
								class="bg-light-warm-grey text-[11px] p-4 rounded overflow-x-auto font-mono mt-2"><code>{`annotations={[
  {
    type: 'x-rule',
    x: '2024-04-01',
    text: 'Bushfires',
    style: { lineStyle: 'dotted' }
  }
]}`}</code></pre>
						</div>
					{/if}

					<!-- Bar Labels -->
					{#if barStackedData}
						<div class="mb-12">
							<h3 class="text-[13px] font-medium text-dark-grey">Bar Labels</h3>
							<p class="text-[11px] text-mid-grey mt-1">
								Adds total value labels above each bar in a stacked bar chart.
							</p>
							<div class="border border-warm-grey rounded mt-2">
								<StratifyPlotChart
									data={barStackedData.data}
									seriesNames={barStackedData.seriesNames}
									seriesColours={barStackedData.seriesColours}
									seriesLabels={barStackedData.seriesLabels}
									chartType="bar-stacked"
									annotations={[{ type: 'bar-labels' }]}
									height={280}
								/>
							</div>
							<pre
								class="bg-light-warm-grey text-[11px] p-4 rounded overflow-x-auto font-mono mt-2"><code>{`<StratifyPlotChart
  ...chartProps
  chartType="bar-stacked"
  annotations={[{ type: 'bar-labels' }]}
  height={280}
/>`}</code></pre>
						</div>
					{/if}

					<!-- Point Annotation (Stacked) -->
					{#if stackedAreaData}
						<div class="mb-12">
							<h3 class="text-[13px] font-medium text-dark-grey">Point Annotation (Stacked)</h3>
							<p class="text-[11px] text-mid-grey mt-1">
								Places a labelled point on a specific series within a stacked chart. The
								<code class="text-[10px] bg-light-warm-grey px-1 rounded">stacked: true</code> option
								positions the point at the correct cumulative value.
							</p>
							<div class="border border-warm-grey rounded mt-2">
								<StratifyPlotChart
									data={stackedAreaData.data}
									seriesNames={stackedAreaData.seriesNames}
									seriesColours={stackedAreaData.seriesColours}
									seriesLabels={stackedAreaData.seriesLabels}
									chartType="stacked-area"
									annotations={[
										{
											type: 'point',
											x: '2024-06-01',
											series: 'gas',
											stacked: true,
											text: "We've paid too much for this.",
											arrow: false,
											style: { colour: '#000', fontSize: 16, fontWeight: 'bold' }
										}
									]}
									height={280}
								/>
							</div>
							<pre
								class="bg-light-warm-grey text-[11px] p-4 rounded overflow-x-auto font-mono mt-2"><code>{`annotations={[
  {
    type: 'point',
    x: '2024-06-01',
    series: 'gas',
    stacked: true,
    text: "We've paid too much for this.",
    arrow: false,
    style: { colour: '#000', fontSize: 16, fontWeight: 'bold' }
  }
]}`}</code></pre>
						</div>
					{/if}

					<!-- Combining Annotations -->
					{#if stackedAreaData}
						<div class="mb-12">
							<h3 class="text-[13px] font-medium text-dark-grey">Combining Annotations</h3>
							<p class="text-[11px] text-mid-grey mt-1">
								Multiple annotations can be combined in a single array. Here an x-rule and a point
								annotation are rendered together on the same chart.
							</p>
							<div class="border border-warm-grey rounded mt-2">
								<StratifyPlotChart
									data={stackedAreaData.data}
									seriesNames={stackedAreaData.seriesNames}
									seriesColours={stackedAreaData.seriesColours}
									seriesLabels={stackedAreaData.seriesLabels}
									chartType="stacked-area"
									annotations={[
										{
											type: 'x-rule',
											x: '2024-04-01',
											text: 'Bushfires',
											style: { lineStyle: 'dotted' }
										},
										{
											type: 'point',
											x: '2024-06-01',
											series: 'gas',
											stacked: true,
											text: "We've paid too much for this.",
											arrow: false,
											style: { colour: '#000', fontSize: 16, fontWeight: 'bold' }
										}
									]}
									height={280}
								/>
							</div>
							<pre
								class="bg-light-warm-grey text-[11px] p-4 rounded overflow-x-auto font-mono mt-2"><code>{`annotations={[
  {
    type: 'x-rule',
    x: '2024-04-01',
    text: 'Bushfires',
    style: { lineStyle: 'dotted' }
  },
  {
    type: 'point',
    x: '2024-06-01',
    series: 'gas',
    stacked: true,
    text: "We've paid too much for this.",
    arrow: false,
    style: { colour: '#000', fontSize: 16, fontWeight: 'bold' }
  }
]}`}</code></pre>
						</div>
					{/if}
				</section>

				<!-- ===== STYLING ===== -->
				<section>
					<h2 class="text-lg font-semibold text-dark-grey mb-3">Styling</h2>

					{#if stackedAreaData}
						<div class="mb-12">
							<h3 class="text-[13px] font-medium text-dark-grey">Custom Rule Styling</h3>
							<p class="text-[11px] text-mid-grey mt-1">
								Annotations accept a <code class="text-[10px] bg-light-warm-grey px-1 rounded">style</code>
								object to customise line appearance, colours, and typography. This example shows a
								dotted red x-rule with red label text.
							</p>
							<div class="border border-warm-grey rounded mt-2">
								<StratifyPlotChart
									data={stackedAreaData.data}
									seriesNames={stackedAreaData.seriesNames}
									seriesColours={stackedAreaData.seriesColours}
									seriesLabels={stackedAreaData.seriesLabels}
									chartType="stacked-area"
									annotations={[
										{
											type: 'x-rule',
											x: '2024-07-01',
											text: 'Mid-year',
											style: {
												lineStyle: 'dotted',
												lineColour: '#c00',
												colour: '#c00',
												fontSize: 11
											}
										}
									]}
									height={280}
								/>
							</div>
							<pre
								class="bg-light-warm-grey text-[11px] p-4 rounded overflow-x-auto font-mono mt-2"><code>{`annotations={[
  {
    type: 'x-rule',
    x: '2024-07-01',
    text: 'Mid-year',
    style: {
      lineStyle: 'dotted',
      lineColour: '#c00',
      colour: '#c00',
      fontSize: 11
    }
  }
]}`}</code></pre>
						</div>
					{/if}
				</section>
			</div>
		</div>
	</div>
{/if}
