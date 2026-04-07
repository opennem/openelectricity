<script>
	import StratifyPlotChart from '$lib/stratify/StratifyPlotChart.svelte';
	import { parseCSV } from '$lib/stratify/csv-parser.js';
	import { getPreset, getPlotStyle } from '$lib/stratify/chart-styles.js';
	import { assignPaletteColours } from '$lib/stratify/colour-palettes.js';
	import { HORIZONTAL_TYPES } from '$lib/stratify/chart-types.js';

	/**
	 * @type {{
	 *   chart: any,
	 *   caption?: string,
	 *   showBranding?: boolean,
	 *   headingTag?: 'h1' | 'h2' | 'h3'
	 * }}
	 */
	let { chart, caption = '', showBranding = false, headingTag = 'h1' } = $props();

	const parsed = $derived(
		parseCSV(chart.csvText, {}, chart.displayMode ?? 'auto', chart.xColumn || 0)
	);
	const preset = $derived(getPreset(chart.stylePreset ?? 'oe'));
	const plotStyleOptions = $derived({ style: getPlotStyle(chart.stylePreset ?? 'oe') });

	// Labels for all non-first data columns (for tooltips)
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
		const presetColours = assignPaletteColours(names, chart.colourPalette ?? 'oe-energy');
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
				// Keep the colour series column even if hidden as a series
				if (!hiddenSet.has(key) || key === colourSeriesKey) filtered[key] = value;
			}
			return filtered;
		});
	});

	// Sort category data if requested
	const sortedData = $derived.by(() => {
		const sort = chart.categorySort ?? 'default';
		if (sort === 'default' || parsed.mode !== 'category') return visibleData;

		return [...visibleData].sort((a, b) => {
			if (sort === 'x-asc' || sort === 'x-desc') {
				const catA = String(a.category ?? '');
				const catB = String(b.category ?? '');
				return sort === 'x-asc' ? catA.localeCompare(catB) : catB.localeCompare(catA);
			}
			let totalA = 0,
				totalB = 0;
			for (const name of visibleSeriesNames) {
				totalA += Number(a[name]) || 0;
				totalB += Number(b[name]) || 0;
			}
			return sort === 'value-asc' ? totalA - totalB : totalB - totalA;
		});
	});

	// Apply data transform (e.g. cumulative running sum)
	const transformedData = $derived.by(() => {
		if ((chart.dataTransform ?? 'none') === 'none') return sortedData;

		/** @type {Record<string, number>} */
		const sums = {};
		for (const name of visibleSeriesNames) sums[name] = 0;

		return sortedData.map((/** @type {Record<string, any>} */ row) => {
			const newRow = { ...row };
			for (const name of visibleSeriesNames) {
				if (newRow[name] != null) {
					sums[name] += Number(newRow[name]) || 0;
					newRow[name] = sums[name];
				}
			}
			return newRow;
		});
	});

	const isHorizontal = $derived(HORIZONTAL_TYPES.has(chart.chartType));

	// Extract sorted domain for category charts
	const hasSortedDomain = $derived(
		(chart.categorySort ?? 'default') !== 'default' && parsed.mode === 'category'
	);
	const sortedCategoryDomain = $derived(
		hasSortedDomain ? transformedData.map((/** @type {any} */ d) => d.category) : undefined
	);
	// For vertical charts, sorted domain goes to X; for horizontal, to Y
	const sortedXDomain = $derived(!isHorizontal ? sortedCategoryDomain : undefined);
	const sortedYDomain = $derived(isHorizontal ? sortedCategoryDomain : undefined);

	const chartHeight = $derived(chart.chartHeight ?? 400);
</script>

<svelte:element
	this={caption ? 'figure' : 'div'}
	style="font-family: {preset.typography.fontFamily};"
>
	{#if chart.title || chart.description}
		<div class="mb-3 space-y-1">
			{#if chart.title}
				<svelte:element
					this={headingTag}
					class="text-dark-grey leading-lg mt-2"
					style="font-size: {preset.typography.titleSize}; font-weight: {preset.typography
						.titleWeight};"
				>
					{chart.title}
				</svelte:element>
			{/if}
			{#if chart.description}
				<p class="text-xs text-mid-grey">{chart.description}</p>
			{/if}
		</div>
	{/if}

	{#if parsed.data.length > 0}
		<StratifyPlotChart
			data={transformedData}
			seriesNames={visibleSeriesNames}
			{seriesColours}
			{seriesLabels}
			chartType={chart.chartType}
			seriesChartTypes={chart.seriesChartTypes ?? {}}
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
			height={chartHeight}
			yTicks={chart.yTicks ?? 0}
			yMinMax={chart.yMinMax ?? false}
			y2Ticks={chart.y2Ticks ?? 0}
			y2MinMax={chart.y2MinMax ?? false}
			tooltipColumns={chart.tooltipColumns ?? []}
			dateColumnKey={parsed.allColumns?.[0]?.key ?? ''}
			dateColumnLabel={parsed.allColumns?.[0]?.label ?? ''}
			xDomain={sortedXDomain}
			yDomain={sortedYDomain}
			showXTickLabels={chart.showXTickLabels ?? true}
			xTicks={chart.xTicks ?? 0}
			xTickRotate={chart.xTickRotate ?? 0}
			marginBottom={chart.marginBottom ?? 0}
			marginLeft={chart.marginLeft ?? 0}
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

	{#if showBranding}
		<div class="py-3 text-center">
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

	{#if caption}
		<figcaption class="font-space text-xs font-medium text-mid-grey mt-4">
			{caption}
		</figcaption>
	{/if}
</svelte:element>
