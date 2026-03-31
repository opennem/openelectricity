<script>
	import StratifyPlotChart from '$lib/components/charts/plot/StratifyPlotChart.svelte';
	import { parseCSV } from '$lib/stratify/csv-parser.js';
	import { getPreset, assignPresetColours, getPlotStyle } from '../../stratify/_config/chart-styles.js';

	/** @type {{ data: { chart: any } }} */
	let { data } = $props();

	const chart = $derived(data.chart);
	const parsed = $derived(parseCSV(chart.csvText));
	const preset = $derived(getPreset(chart.stylePreset ?? 'oe'));
	const plotStyleOptions = $derived({ style: getPlotStyle(chart.stylePreset ?? 'oe') });

	// Merge colours: user overrides > preset palette > parsed defaults
	const seriesColours = $derived.by(() => {
		const presetColours = assignPresetColours(parsed.seriesNames, chart.stylePreset ?? 'oe');
		/** @type {Record<string, string>} */
		const colours = {};
		for (const name of parsed.seriesNames) {
			colours[name] = chart.userSeriesColours[name] || presetColours[name] || parsed.seriesColours[name];
		}
		return colours;
	});

	// Merge labels: user overrides > parsed defaults
	const seriesLabels = $derived.by(() => {
		/** @type {Record<string, string>} */
		const labels = {};
		for (const name of parsed.seriesNames) {
			labels[name] = chart.userSeriesLabels[name] || parsed.seriesLabels[name];
		}
		return labels;
	});

	// Filter hidden series
	const hiddenSet = $derived(new Set(chart.hiddenSeries));
	const visibleSeriesNames = $derived(parsed.seriesNames.filter((/** @type {string} */ name) => !hiddenSet.has(name)));

	const visibleData = $derived.by(() => {
		if (hiddenSet.size === 0) return parsed.data;
		return parsed.data.map((/** @type {Record<string, any>} */ row) => {
			/** @type {Record<string, any>} */
			const filtered = {};
			for (const [key, value] of Object.entries(row)) {
				if (!hiddenSet.has(key)) filtered[key] = value;
			}
			return filtered;
		});
	});
</script>

<svelte:head>
	<title>{chart.title || 'Chart'} — Open Electricity</title>
	{#if chart.description}
		<meta name="description" content={chart.description} />
	{/if}
</svelte:head>

<div class="flex flex-col min-h-dvh bg-white" style="font-family: {preset.typography.fontFamily};">
	<div class="flex-1 flex flex-col max-w-5xl w-full mx-auto px-6 py-8">
		{#if chart.title || chart.description}
			<div class="mb-4 space-y-1">
				{#if chart.title}
					<h1
						class="text-dark-grey"
						style="font-size: {preset.typography.titleSize}; font-weight: {preset.typography.titleWeight};"
					>
						{chart.title}
					</h1>
				{/if}
				{#if chart.description}
					<p class="text-xs text-mid-grey">{chart.description}</p>
				{/if}
			</div>
		{/if}

		{#if parsed.data.length > 0}
			<StratifyPlotChart
				data={visibleData}
				seriesNames={visibleSeriesNames}
				{seriesColours}
				{seriesLabels}
				chartType={chart.chartType}
				annotations={chart.annotations}
				options={plotStyleOptions}
				height={400}
			/>
		{/if}

		{#if chart.notes || chart.dataSource}
			<div class="mt-4 space-y-0.5">
				{#if chart.dataSource}
					<p class="text-[10px] text-mid-grey">Source: {chart.dataSource}</p>
				{/if}
				{#if chart.notes}
					<p class="text-[10px] text-mid-grey">{chart.notes}</p>
				{/if}
			</div>
		{/if}
	</div>

	{#if chart.showBranding}
		<div class="py-3 px-6 text-center">
			<a
				href="https://openelectricity.org.au"
				target="_blank"
				rel="noopener noreferrer"
				class="text-[10px] text-mid-grey hover:text-dark-grey"
			>
				Open Electricity
			</a>
		</div>
	{/if}
</div>
