<script>
	import { getContext, onMount, onDestroy } from 'svelte';
	import Meta from '$lib/components/Meta.svelte';
	import ChartStore from '$lib/components/charts/v2/ChartStore.svelte.js';

	import { parseCSV } from './_utils/csv-parser.js';
	import { examples } from './_utils/examples.js';

	import DataInput from './_components/DataInput.svelte';
	import ChartTypeSelector from './_components/ChartTypeSelector.svelte';
	import ChartConfig from './_components/ChartConfig.svelte';
	import SeriesConfig from './_components/SeriesConfig.svelte';
	import ChartPreview from './_components/ChartPreview.svelte';

	// Hide nav/footer for full-screen builder layout
	const layout = getContext('layout-fullscreen');
	onMount(() => layout.setFullscreen(true));
	onDestroy(() => layout.setFullscreen(false));

	// Builder state
	let csvText = $state('');
	let chartTitle = $state('');
	let chartDescription = $state('');
	let dataSource = $state('');
	let notes = $state('');
	/** @type {'stacked-area' | 'area' | 'line'} */
	let selectedChartType = $state('stacked-area');
	/** @type {string[]} */
	let hiddenSeries = $state([]);
	/** @type {Record<string, string>} */
	let userSeriesColours = $state({});
	/** @type {Record<string, string>} */
	let userSeriesLabels = $state({});

	// Parse CSV reactively
	let parsedData = $derived(parseCSV(csvText));
	let hasData = $derived(parsedData.data.length > 0);

	// Merge parsed colours/labels with user customisations (user overrides take precedence)
	let seriesColours = $derived.by(() => {
		const parsed = parsedData;
		if (parsed.seriesNames.length === 0) return userSeriesColours;

		/** @type {Record<string, string>} */
		const merged = {};
		for (const name of parsed.seriesNames) {
			merged[name] = userSeriesColours[name] || parsed.seriesColours[name];
		}
		return merged;
	});

	let seriesLabels = $derived.by(() => {
		const parsed = parsedData;
		if (parsed.seriesNames.length === 0) return userSeriesLabels;

		/** @type {Record<string, string>} */
		const merged = {};
		for (const name of parsed.seriesNames) {
			merged[name] = userSeriesLabels[name] || parsed.seriesLabels[name];
		}
		return merged;
	});

	// Create chart store
	const chartStore = new ChartStore({
		key: Symbol('stratify'),
		title: '',
		chartType: 'stacked-area',
		hideDataOptions: true,
		hideChartTypeOptions: true
	});

	// Sync parsed data into chart store
	$effect(() => {
		if (hasData) {
			chartStore.seriesData = parsedData.data;
			chartStore.seriesNames = parsedData.seriesNames;
			chartStore.seriesColours = seriesColours;
			chartStore.seriesLabels = seriesLabels;
			chartStore.hiddenSeriesNames = hiddenSeries;
		} else {
			chartStore.seriesData = [];
			chartStore.seriesNames = [];
		}
	});

	// Sync chart type
	$effect(() => {
		chartStore.chartOptions.selectedChartType = selectedChartType;
	});

	/**
	 * Load an example dataset into the builder.
	 * @param {import('./_utils/examples.js').StratifyExample} example
	 */
	function loadExample(example) {
		csvText = example.csvData;
		chartTitle = example.title;
		chartDescription = example.description;
		dataSource = example.dataSource;
		notes = example.notes;
		selectedChartType = /** @type {'stacked-area' | 'area' | 'line'} */ (example.chartType);
		userSeriesColours = {};
		userSeriesLabels = {};
		hiddenSeries = [];
	}
</script>

<Meta title="Stratify" description="Create and embed data charts" />

<div class="flex h-[calc(100vh-64px)] flex-col">
	<!-- Top bar -->
	<div class="flex items-center justify-between border-b border-mid-warm-grey px-6 py-3">
		<div class="flex items-center gap-3">
			<a
				href="/studio"
				class="text-mid-grey transition-colors hover:text-black"
				title="Back to Studio"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M19 12H5" />
					<path d="m12 19-7-7 7-7" />
				</svg>
			</a>
			<h1 class="text-lg font-semibold tracking-wide">Stratify</h1>
		</div>
	</div>

	<!-- Split pane -->
	<div class="flex flex-1 overflow-hidden">
		<!-- Left panel: options -->
		<div class="w-[380px] shrink-0 space-y-6 overflow-y-auto border-r border-mid-warm-grey p-6">
			<DataInput bind:value={csvText} {parsedData} />

			{#if hasData}
				<div class="border-t border-mid-warm-grey pt-6">
					<ChartTypeSelector bind:selected={selectedChartType} />
				</div>

				<div class="border-t border-mid-warm-grey pt-6">
					<ChartConfig
						bind:title={chartTitle}
						bind:description={chartDescription}
						bind:dataSource
						bind:notes
					/>
				</div>

				<div class="border-t border-mid-warm-grey pt-6">
					<SeriesConfig
						seriesNames={parsedData.seriesNames}
						bind:seriesLabels={userSeriesLabels}
						bind:seriesColours={userSeriesColours}
						bind:hiddenSeries
					/>
				</div>
			{/if}
		</div>

		<!-- Right panel: chart preview -->
		<div class="flex flex-1 flex-col overflow-y-auto p-6">
			{#if hasData}
				<div class="flex-1">
					<ChartPreview
						chart={chartStore}
						title={chartTitle}
						description={chartDescription}
						{dataSource}
						{notes}
					/>
				</div>
			{:else}
				<div class="flex h-full flex-col items-center justify-center gap-6 text-mid-grey">
					<p class="text-sm">Paste CSV or tab-separated data to get started</p>
					<div class="text-center">
						<p class="mb-3 text-xs uppercase tracking-wider">or try an example</p>
						<div class="flex flex-wrap justify-center gap-2">
							{#each examples as example (example.name)}
								<button
									type="button"
									onclick={() => loadExample(example)}
									class="rounded-lg border border-mid-warm-grey px-3 py-1.5 text-xs text-dark-grey hover:border-dark-grey hover:bg-light-warm-grey"
								>
									{example.name}
								</button>
							{/each}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
