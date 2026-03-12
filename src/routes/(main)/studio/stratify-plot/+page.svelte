<script>
	import { getContext, onMount, onDestroy } from 'svelte';
	import Meta from '$lib/components/Meta.svelte';
	import PlotChart from '$lib/components/charts/plot/PlotChart.svelte';
	import { parseCSV } from '$lib/stratify/csv-parser.js';
	import { examples } from '../stratify/_utils/examples.js';
	import {
		createStackedAreaOptions,
		createLineOptions,
		createStackedBarOptions,
		createGroupedBarOptions
	} from '$lib/components/charts/plot/plot-configs.js';

	const layout = getContext('layout-fullscreen');
	onMount(() => layout.setFullscreen(true));
	onDestroy(() => layout.setFullscreen(false));

	const configMap = {
		'stacked-area': createStackedAreaOptions,
		area: createStackedAreaOptions,
		line: createLineOptions,
		'bar-stacked': createStackedBarOptions,
		'grouped-bar': createGroupedBarOptions
	};

	/** Pick one example per chart type to avoid duplicates */
	const selectedExamples = [
		examples.find((e) => e.chartType === 'stacked-area'),
		examples.find((e) => e.chartType === 'line'),
		examples.find((e) => e.chartType === 'bar-stacked'),
		examples.find((e) => e.chartType === 'grouped-bar')
	].filter((e) => e !== undefined);

	const charts = selectedExamples.map((example) => {
		const parsed = parseCSV(example.csvData);
		const configFn = configMap[/** @type {keyof configMap} */ (example.chartType)] || createLineOptions;
		return {
			title: example.title,
			description: example.description,
			dataSource: example.dataSource,
			notes: example.notes,
			chartType: example.chartType,
			options: configFn(parsed.data, parsed.seriesNames, parsed.seriesColours, parsed.seriesLabels)
		};
	});

	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});
</script>

<Meta title="Stratify Plot" description="Observable Plot chart showcase" />

{#if mounted}
	<div class="flex flex-col h-dvh overflow-hidden font-mono">
		<div
			class="flex items-center gap-3 px-4 py-2 border-b border-warm-grey bg-light-warm-grey/50"
		>
			<span class="text-[11px] font-medium text-dark-grey tracking-wide uppercase"
				>Stratify Plot</span
			>
			<span class="text-[10px] text-mid-grey">Observable Plot</span>
		</div>

		<div class="flex-1 min-h-0 overflow-y-auto p-6">
			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">
				{#each charts as chart (chart.chartType)}
					<div class="border border-warm-grey rounded">
						<div
							class="flex items-center gap-2 px-4 py-2.5 border-b border-warm-grey bg-light-warm-grey/50"
						>
							<span class="text-[11px] font-medium text-dark-grey tracking-wide uppercase"
								>{chart.chartType}</span
							>
						</div>

						<div class="px-4 pt-3 pb-1">
							<h3 class="text-[12px] font-medium text-dark-grey leading-tight">
								{chart.title}
							</h3>
							{#if chart.description}
								<p class="text-[10px] text-mid-grey mt-1">{chart.description}</p>
							{/if}
						</div>

						<div class="px-2">
							<PlotChart options={chart.options} height={280} />
						</div>

						{#if chart.dataSource || chart.notes}
							<div class="px-4 py-2 border-t border-warm-grey">
								{#if chart.notes}
									<p class="text-[9px] text-mid-grey italic">{chart.notes}</p>
								{/if}
								{#if chart.dataSource}
									<p class="text-[9px] text-mid-warm-grey">Source: {chart.dataSource}</p>
								{/if}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}
