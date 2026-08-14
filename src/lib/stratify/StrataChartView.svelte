<script>
	import StratifyPlotChart from '$lib/stratify/StratifyPlotChart.svelte';
	import StratifyMapChart from '$lib/stratify/StratifyMapChart.svelte';
	import AnimatedFacetChart from '$lib/stratify/AnimatedFacetChart.svelte';
	import { parseCSV } from '$lib/stratify/csv-parser.js';
	import { uniqueColumnValues } from '$lib/stratify/chart-data.js';
	import { getPreset, getPlotStyle } from '$lib/stratify/chart-styles.js';
	import { assignPaletteColours, getPaletteSwatchColours } from '$lib/stratify/colour-palettes.js';
	import { makeValueFormatter } from '$lib/components/charts/plot/plot-configs.js';
	import { scaleSqrt } from 'd3-scale';
	import {
		compileAnnotationData,
		DEFAULT_ANNOTATION_MAPPINGS,
		DEFAULT_ANNOTATION_STYLE,
		parseAnnotationTable
	} from '$lib/stratify/annotation-data.js';
	import {
		HORIZONTAL_TYPES,
		MAP_TYPES,
		WATERFALL_TYPES,
		WATERFALL_ROLE_KEYS,
		WATERFALL_ROLE_LABELS,
		getWaterfallRoleColours
	} from '$lib/stratify/chart-types.js';

	/**
	 * @type {{
	 *   chart: any,
	 *   caption?: string,
	 *   showBranding?: boolean,
	 *   headingTag?: 'h1' | 'h2' | 'h3'
	 * }}
	 */
	let { chart, caption = '', showBranding = false, headingTag = 'h1' } = $props();

	const isMap = $derived(MAP_TYPES.has(chart.chartType));

	const parsed = $derived(
		parseCSV(chart.csvText, {}, chart.displayMode ?? 'auto', chart.xColumn || 0)
	);
	const annotationStyle = $derived({
		...DEFAULT_ANNOTATION_STYLE,
		...(chart.annotationStyle ?? {})
	});
	const annotationMappings = $derived({
		...DEFAULT_ANNOTATION_MAPPINGS,
		...(chart.annotationMappings ?? {})
	});
	const annotationTable = $derived(parseAnnotationTable(chart.annotationCsvText ?? ''));
	const compiledAnnotations = $derived(
		compileAnnotationData(
			annotationTable,
			parsed.mode,
			annotationMappings,
			annotationStyle,
			chart.annotationRowOptions ?? {}
		)
	);
	const dataAnnotations = $derived(
		MAP_TYPES.has(chart.chartType) || HORIZONTAL_TYPES.has(chart.chartType)
			? []
			: compiledAnnotations.annotations
	);
	const preset = $derived(getPreset(chart.stylePreset ?? 'oe'));
	const plotStyleOptions = $derived({
		style: getPlotStyle(chart.stylePreset ?? 'oe'),
		curve: chart.chartCurve,
		borderWidth: chart.chartBorderWidth ?? 0.5,
		borderColour: chart.chartBorderColour ?? '#000000'
	});

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
	const facetColumnKey = $derived(chart.facetColumn ?? null);
	const scatterSizeColumnKey = $derived(
		chart.chartType === 'scatter' ? (chart.scatterSizeColumn ?? null) : null
	);
	const lineRangeColumnKeys = $derived.by(() => {
		const min = chart.lineRangeMinColumn ?? null;
		const max = chart.lineRangeMaxColumn ?? null;
		if (chart.chartType !== 'line' || !min || !max || min === max) return [];
		const numericKeys = parsed.allColumns
			.slice(1)
			.filter((/** @type {{ isNumeric: boolean }} */ column) => column.isNumeric)
			.map((/** @type {{ key: string }} */ column) => column.key);
		return numericKeys.includes(min) && numericKeys.includes(max) ? [min, max] : [];
	});
	const lineRangeMinColumnKey = $derived(lineRangeColumnKeys[0] ?? null);
	const lineRangeMaxColumnKey = $derived(lineRangeColumnKeys[1] ?? null);
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

	// Waterfall colouring (single/sum): 'semantic' colours by role
	// (start/up/down/total); 'series' colours each CSV row individually.
	const isWaterfallColourable = $derived(
		WATERFALL_TYPES.has(chart.chartType) &&
			(chart.waterfallMode === 'single' || chart.waterfallMode === 'sum')
	);
	const waterfallColourMode = $derived(chart.waterfallColourMode ?? 'semantic');
	const isWaterfallPerRow = $derived(isWaterfallColourable && waterfallColourMode === 'series');
	const isWaterfallSemantic = $derived(isWaterfallColourable && waterfallColourMode === 'semantic');

	const waterfallSemanticColours = $derived.by(() => {
		if (!isWaterfallSemantic) return {};
		const defaults = getWaterfallRoleColours(
			getPaletteSwatchColours(chart.colourPalette ?? 'oe-energy')
		);
		/** @type {Record<string, string>} */
		const map = {};
		for (const role of WATERFALL_ROLE_KEYS) {
			map[role] = chart.userSeriesColours[role] || defaults[role];
		}
		return map;
	});
	const waterfallSemanticLabels = $derived.by(() => {
		if (!isWaterfallSemantic) return {};
		/** @type {Record<string, string>} */
		const map = {};
		for (const role of WATERFALL_ROLE_KEYS) {
			map[role] = chart.userSeriesLabels[role] || WATERFALL_ROLE_LABELS[role];
		}
		return map;
	});
	const waterfallRowNames = $derived.by(() => {
		if (!isWaterfallPerRow) return [];
		const key =
			parsed.mode === 'category' ? 'category' : parsed.mode === 'linear' ? 'linear' : 'date';
		/** @type {Set<string>} */
		const seen = new Set();
		/** @type {string[]} */
		const names = [];
		for (const row of parsed.data) {
			const name = String(row[key]);
			if (!seen.has(name)) {
				seen.add(name);
				names.push(name);
			}
		}
		if (chart.waterfallShowTotal ?? true) names.push('Total');
		return names;
	});
	const waterfallRowColours = $derived.by(() => {
		if (!isWaterfallPerRow) return {};
		const firstCol = parsed.seriesNames[0];
		const presetCols = assignPaletteColours(parsed.seriesNames, chart.colourPalette ?? 'oe-energy');
		const base =
			chart.userSeriesColours[firstCol] ||
			presetCols[firstCol] ||
			parsed.seriesColours[firstCol] ||
			'#888';
		/** @type {Record<string, string>} */
		const map = {};
		for (const name of waterfallRowNames) map[name] = chart.userSeriesColours[name] || base;
		return map;
	});
	const waterfallRowLabels = $derived.by(() => {
		if (!isWaterfallPerRow) return {};
		/** @type {Record<string, string>} */
		const map = {};
		for (const name of waterfallRowNames) map[name] = chart.userSeriesLabels[name] || name;
		return map;
	});

	// Apply user-defined series order, then filter hidden (excluding colour-series and facet columns)
	const orderedSeriesNames = $derived.by(() => {
		const names = parsed.seriesNames.filter(
			(/** @type {string} */ n) =>
				n !== colourSeriesKey &&
				n !== facetColumnKey &&
				n !== scatterSizeColumnKey &&
				n !== lineRangeMinColumnKey &&
				n !== lineRangeMaxColumnKey
		);
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
				// Keep the colour-series and facet columns even if hidden as a series
				if (
					!hiddenSet.has(key) ||
					key === colourSeriesKey ||
					key === facetColumnKey ||
					key === scatterSizeColumnKey ||
					key === lineRangeMinColumnKey ||
					key === lineRangeMaxColumnKey
				)
					filtered[key] = value;
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
		const transformedColumns = new Set([
			...visibleSeriesNames,
			...(lineRangeMinColumnKey ? [lineRangeMinColumnKey] : []),
			...(lineRangeMaxColumnKey ? [lineRangeMaxColumnKey] : [])
		]);
		for (const name of transformedColumns) sums[name] = 0;

		return sortedData.map((/** @type {Record<string, any>} */ row) => {
			const newRow = { ...row };
			for (const name of transformedColumns) {
				if (newRow[name] != null) {
					sums[name] += Number(newRow[name]) || 0;
					newRow[name] = sums[name];
				}
			}
			return newRow;
		});
	});

	const isHorizontal = $derived(HORIZONTAL_TYPES.has(chart.chartType));

	// Animation mode requires a facet column, the toggle, and >1 frame.
	const animateFacetValues = $derived(uniqueColumnValues(transformedData, facetColumnKey));
	const isAnimating = $derived(
		!!chart.animateAsOneChart && !!facetColumnKey && animateFacetValues.length > 1
	);
	const animatedSeriesNames = $derived([
		...visibleSeriesNames,
		...(lineRangeMinColumnKey ? [lineRangeMinColumnKey] : []),
		...(lineRangeMaxColumnKey ? [lineRangeMaxColumnKey] : [])
	]);

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

	const chartHeight = $derived(chart.chartHeight ?? 250);

	const scatterSizeLegend = $derived.by(() => {
		if (chart.chartType !== 'scatter' || !scatterSizeColumnKey || !(chart.showLegend ?? true)) {
			return null;
		}
		const values = parsed.data
			.map((/** @type {Record<string, any>} */ row) => row[scatterSizeColumnKey])
			.filter((value) => value != null && value !== '' && Number.isFinite(Number(value)))
			.map(Number);
		if (values.length === 0) return null;
		const min = Math.min(...values);
		const max = Math.max(...values);
		const pointRadius = chart.scatterPointRadius ?? 4;
		const minRadius = chart.scatterMinRadius ?? 3;
		const maxRadius = chart.scatterMaxRadius ?? 18;
		const scale =
			min === max
				? () => pointRadius
				: scaleSqrt().domain([min, max]).range([minRadius, maxRadius]);
		const legendValues = min === max ? [min] : [min, min + (max - min) / 2, max];
		const formatValue = makeValueFormatter(chart.valueFormat ?? '1');
		return {
			label:
				parsed.allColumns?.find(
					(/** @type {{ key: string }} */ column) => column.key === scatterSizeColumnKey
				)?.label ?? scatterSizeColumnKey,
			entries: legendValues.map((value) => ({
				value: formatValue(value),
				radius: Number(scale(value))
			}))
		};
	});
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

	{#snippet plotChart(
		/** @type {Array<Record<string, any>>} */ chartData,
		/** @type {string | null} */ overrideFacet,
		/** @type {number | null} */ overrideY1Min,
		/** @type {number | null} */ overrideY1Max
	)}
		<StratifyPlotChart
			data={chartData}
			seriesNames={visibleSeriesNames}
			{seriesColours}
			{seriesLabels}
			chartType={chart.chartType}
			waterfallMode={chart.waterfallMode ?? 'single'}
			waterfallShowTotal={chart.waterfallShowTotal ?? true}
			waterfallColourMode={chart.waterfallColourMode ?? 'semantic'}
			{waterfallRowColours}
			{waterfallRowLabels}
			{waterfallSemanticColours}
			{waterfallSemanticLabels}
			valueFormat={chart.valueFormat ?? '1'}
			seriesChartTypes={chart.seriesChartTypes ?? {}}
			seriesLineStyles={chart.seriesLineStyles ?? {}}
			plotOverrides={chart.plotOverrides}
			colourSeries={colourSeriesKey}
			{colourGroupNames}
			{dataColumnLabels}
			xLabel={chart.xLabel ?? ''}
			yLabel={chart.yLabel ?? ''}
			seriesYAxis={chart.seriesYAxis ?? {}}
			y2Label={chart.y2Label ?? ''}
			annotations={chart.annotations}
			{dataAnnotations}
			{annotationStyle}
			options={plotStyleOptions}
			height={chartHeight}
			yTicks={chart.yTicks ?? 0}
			yMinMax={chart.yMinMax ?? false}
			y1Min={overrideY1Min}
			y1Max={overrideY1Max}
			y2Ticks={chart.y2Ticks ?? 0}
			y2MinMax={chart.y2MinMax ?? false}
			y2Min={chart.y2Min ?? null}
			y2Max={chart.y2Max ?? null}
			tooltipColumns={chart.tooltipColumns ?? []}
			tooltipDateFormat={chart.tooltipDateFormat ?? 'date'}
			dateColumnKey={parsed.allColumns?.[0]?.key ?? ''}
			dateColumnLabel={parsed.allColumns?.[0]?.label ?? ''}
			xDomain={sortedXDomain}
			yDomain={sortedYDomain}
			showXTickLabels={chart.showXTickLabels ?? true}
			showLegend={chart.showLegend ?? true}
			lineRangeMinColumn={lineRangeMinColumnKey}
			lineRangeMaxColumn={lineRangeMaxColumnKey}
			lineRangeOpacity={chart.lineRangeOpacity ?? 0.2}
			scatterSizeColumn={scatterSizeColumnKey}
			scatterPointRadius={chart.scatterPointRadius ?? 4}
			scatterMinRadius={chart.scatterMinRadius ?? 3}
			scatterMaxRadius={chart.scatterMaxRadius ?? 18}
			scatterPointOpacity={chart.scatterPointOpacity ?? 0.7}
			facetColumn={overrideFacet}
			facetPanelsPerRow={chart.facetPanelsPerRow ?? 0}
			xTicks={chart.xTicks ?? 0}
			xTickRotate={chart.xTickRotate ?? 0}
			marginBottom={chart.marginBottom ?? 0}
			marginLeft={chart.marginLeft ?? 0}
		/>
	{/snippet}

	{#if isMap}
		<StratifyMapChart {chart} height={chartHeight} />
	{:else if parsed.data.length > 0}
		{#if isAnimating}
			<AnimatedFacetChart
				data={transformedData}
				seriesNames={animatedSeriesNames}
				facetColumn={facetColumnKey}
				facetValues={animateFacetValues}
				frameDurationMs={chart.animationSpeedMs}
				loop={chart.animationAutoLoop}
				autoPlay={chart.animationAutoPlay}
				tween={chart.animationTween ?? true}
			>
				{#snippet children(frame)}
					{@render plotChart(
						frame.data,
						null,
						chart.y1Min ?? frame.yMin,
						chart.y1Max ?? frame.yMax
					)}
				{/snippet}
			</AnimatedFacetChart>
		{:else}
			{@render plotChart(
				transformedData,
				chart.facetColumn ?? null,
				chart.y1Min ?? null,
				chart.y1Max ?? null
			)}
		{/if}
	{/if}

	{#if scatterSizeLegend}
		<div
			class="mt-1 flex items-end justify-end gap-3 text-[9px] text-mid-grey"
			aria-label="Size legend"
		>
			<span class="self-center font-medium">{scatterSizeLegend.label}</span>
			{#each scatterSizeLegend.entries as entry, index (`${entry.value}-${index}`)}
				<div class="flex flex-col items-center gap-0.5">
					<span
						class="block rounded-full border border-mid-grey/70 bg-mid-grey/25"
						style:width={`${entry.radius * 2}px`}
						style:height={`${entry.radius * 2}px`}
					></span>
					<span>{entry.value}</span>
				</div>
			{/each}
		</div>
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
