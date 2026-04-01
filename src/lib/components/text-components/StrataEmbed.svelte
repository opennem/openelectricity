<script>
	import StratifyPlotChart from '$lib/components/charts/plot/StratifyPlotChart.svelte';
	import { parseCSV } from '$lib/stratify/csv-parser.js';
	import {
		getPreset,
		assignPresetColours,
		getPlotStyle
	} from '$lib/stratify/chart-styles.js';

	/**
	 * @type {{
	 *   chart: any,
	 *   caption?: string
	 * }}
	 */
	let { chart, caption = '' } = $props();

	const parsed = $derived(parseCSV(chart.csvText, {}, chart.displayMode ?? 'auto'));
	const preset = $derived(getPreset(chart.stylePreset ?? 'oe'));
	const plotStyleOptions = $derived({ style: getPlotStyle(chart.stylePreset ?? 'oe') });

	/** Labels for all non-first data columns (for tooltips) */
	const dataColumnLabels = $derived(
		Object.fromEntries(
			(parsed.allColumns ?? [])
				.slice(1)
				.map((/** @type {{ key: string, label: string }} */ col) => [col.key, col.label])
		)
	);

	// Colour series support
	const colourSeriesKey = $derived(chart.colourSeries ?? null);
	const hasColourSeries = $derived(
		colourSeriesKey !== null && parsed.seriesNames.includes(colourSeriesKey)
	);
	const colourGroupNames = $derived.by(() => {
		if (!hasColourSeries) return [];
		/** @type {Set<string>} */
		const seen = new Set();
		/** @type {string[]} */
		const groups = [];
		for (const row of parsed.data) {
			const val = row[/** @type {string} */ (colourSeriesKey)];
			if (val != null && !seen.has(String(val))) {
				seen.add(String(val));
				groups.push(String(val));
			}
		}
		return groups;
	});

	// Merge colours: user overrides > preset palette > parsed defaults
	const seriesColours = $derived.by(() => {
		const names = hasColourSeries ? colourGroupNames : parsed.seriesNames;
		const presetColours = assignPresetColours(names, chart.stylePreset ?? 'oe');
		/** @type {Record<string, string>} */
		const colours = {};
		for (const name of names) {
			colours[name] =
				chart.userSeriesColours[name] || presetColours[name] || parsed.seriesColours[name];
		}
		return colours;
	});

	// Merge labels: user overrides > parsed defaults
	const seriesLabels = $derived.by(() => {
		const names = hasColourSeries ? colourGroupNames : parsed.seriesNames;
		/** @type {Record<string, string>} */
		const labels = {};
		for (const name of names) {
			labels[name] = chart.userSeriesLabels[name] || parsed.seriesLabels[name] || name;
		}
		return labels;
	});

	// Apply user-defined series order, then filter hidden (excluding colour series column)
	const orderedSeriesNames = $derived.by(() => {
		const names = parsed.seriesNames.filter((/** @type {string} */ n) => n !== colourSeriesKey);
		const order = chart.seriesOrder;
		if (!order || order.length === 0) return names;
		const nameSet = new Set(names);
		const ordered = order.filter((/** @type {string} */ n) => nameSet.has(n));
		const orderedSet = new Set(ordered);
		for (const n of names) {
			if (!orderedSet.has(n)) ordered.push(n);
		}
		return ordered;
	});
	const hiddenSet = $derived(new Set(chart.hiddenSeries));
	const visibleSeriesNames = $derived(
		orderedSeriesNames.filter((/** @type {string} */ name) => !hiddenSet.has(name))
	);

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

<figure class="stratify-embed" style="font-family: {preset.typography.fontFamily};">
	{#if chart.title || chart.description}
		<div class="mb-3 space-y-1">
			{#if chart.title}
				<h3
					class="text-dark-grey"
					style="font-size: {preset.typography.titleSize}; font-weight: {preset.typography.titleWeight};"
				>
					{chart.title}
				</h3>
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
			seriesChartTypes={chart.seriesChartTypes}
			plotOverrides={chart.plotOverrides}
			colourSeries={colourSeriesKey}
			{colourGroupNames}
			{dataColumnLabels}
			xLabel={chart.xLabel ?? ''}
			yLabel={chart.yLabel ?? ''}
			seriesYAxis={chart.seriesYAxis ?? {}}
			y2Label={chart.y2Label ?? ''}
			annotations={chart.annotations}
			options={plotStyleOptions}
			height={chart.chartHeight ?? 400}
			yTicks={chart.yTicks ?? 0}
			yMinMax={chart.yMinMax ?? false}
			y2Ticks={chart.y2Ticks ?? 0}
			y2MinMax={chart.y2MinMax ?? false}
			tooltipColumns={chart.tooltipColumns ?? []}
			xTicks={chart.xTicks ?? 0}
			xTickRotate={chart.xTickRotate ?? 0}
			marginBottom={chart.marginBottom ?? 0}
		/>
	{/if}

	{#if chart.dataSource || chart.notes}
		<div class="mt-3 space-y-0.5">
			{#if chart.dataSource}
				<p class="text-[10px] text-mid-grey">Source: {chart.dataSource}</p>
			{/if}
			{#if chart.notes}
				<p class="text-[10px] text-mid-grey">{chart.notes}</p>
			{/if}
		</div>
	{/if}

	{#if caption}
		<figcaption class="font-space text-xs font-medium text-mid-grey mt-4">
			{caption}
		</figcaption>
	{/if}
</figure>

<style>
	.stratify-embed {
		width: 100%;
		padding: 1rem 0;
	}
</style>
