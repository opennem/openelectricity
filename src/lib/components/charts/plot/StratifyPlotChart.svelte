<script>
	import PlotChart from './PlotChart.svelte';
	import { ruleX, tip, pointerX } from '@observablehq/plot';
	import {
		createStackedAreaOptions,
		createLineOptions,
		createStackedBarOptions,
		createGroupedBarOptions,
		createDotOptions,
		createMixedMarkOptions,
		createColourGroupedBarOptions
	} from './plot-configs.js';
	import { processAnnotations } from './plot-annotations.js';
	import { applyPlotOverrides } from './plot-overrides.js';

	/**
	 * @typedef {'stacked-area' | 'area' | 'line' | 'bar-stacked' | 'grouped-bar' | 'dot'} StratifyPlotChartType
	 */

	/** @type {Record<string, Function>} */
	const CONFIG_MAP = {
		'stacked-area': createStackedAreaOptions,
		area: createStackedAreaOptions,
		line: createLineOptions,
		'bar-stacked': createStackedBarOptions,
		'grouped-bar': createGroupedBarOptions,
		dot: createDotOptions
	};

	const TIME_SERIES_TYPES = new Set(['stacked-area', 'area', 'line', 'dot']);
	const BAR_TYPES = new Set(['bar-stacked', 'grouped-bar']);

	/**
	 * @type {{
	 *   data: Array<Record<string, any>>,
	 *   seriesNames: string[],
	 *   seriesColours: Record<string, string>,
	 *   seriesLabels: Record<string, string>,
	 *   chartType: StratifyPlotChartType,
	 *   seriesChartTypes?: Record<string, string>,
	 *   plotOverrides?: import('./plot-overrides.js').PlotOverrides | null,
	 *   colourSeries?: string | null,
	 *   colourGroupNames?: string[],
	 *   dataColumnLabels?: Record<string, string>,
	 *   height?: number,
	 *   xLabel?: string,
	 *   yLabel?: string,
	 *   xTicks?: number,
	 *   xTickRotate?: number,
	 *   marginBottom?: number,
	 *   options?: import('./plot-configs.js').TimeSeriesOptions,
	 *   annotations?: import('./plot-annotations.js').Annotation[],
	 *   class?: string
	 * }}
	 */
	let {
		data,
		seriesNames,
		seriesColours,
		seriesLabels,
		chartType,
		seriesChartTypes = {},
		plotOverrides = null,
		colourSeries = null,
		colourGroupNames = [],
		dataColumnLabels = {},
		height = 300,
		xLabel = '',
		yLabel = '',
		xTicks = 0,
		xTickRotate = 0,
		marginBottom = 0,
		options = {},
		annotations = [],
		class: className = ''
	} = $props();

	let plotOptions = $derived.by(() => {
		if (!data.length || !seriesNames.length) return null;

		// Process annotations to get extra marks and margin adjustments
		const annotationResult = annotations.length
			? processAnnotations(
					annotations,
					data,
					seriesNames,
					seriesColours,
					seriesLabels,
					chartType,
					height
				)
			: { marks: [], marginRight: 0 };

		// Merge annotation margin with user options
		const mergedOptions =
			annotationResult.marginRight > 0
				? {
						...options,
						marginRight: Math.max(options.marginRight ?? 0, annotationResult.marginRight)
					}
				: options;

		// Use colour-grouped bar when a colour series is active and chart is a bar type
		let opts;
		if (colourSeries && colourGroupNames.length > 0 && BAR_TYPES.has(chartType)) {
			opts = createColourGroupedBarOptions(
				data,
				seriesNames[0],
				colourGroupNames,
				seriesColours,
				seriesLabels,
				colourSeries,
				mergedOptions
			);
		} else {
			const hasMixedTypes = Object.keys(seriesChartTypes).length > 0;
			opts = hasMixedTypes
				? createMixedMarkOptions(
						data,
						seriesNames,
						seriesColours,
						seriesLabels,
						seriesChartTypes,
						chartType,
						mergedOptions
					)
				: (CONFIG_MAP[chartType] || createLineOptions)(
						data,
						seriesNames,
						seriesColours,
						seriesLabels,
						mergedOptions
					);
		}

		// Apply x-axis tick count if configured
		if (xTicks > 0) {
			const xScale = opts.x || {};
			if (xScale.type === 'band') {
				// Band scales ignore `ticks` — use tickFormat to hide labels
				const domain = xScale.domain || data.map((/** @type {any} */ d) => d.category);
				const step = Math.max(1, Math.ceil(domain.length / xTicks));
				const visible = new Set(
					domain.filter((/** @type {any} */ _, /** @type {number} */ i) => i % step === 0)
				);
				opts.x = {
					...xScale,
					tickFormat: (/** @type {any} */ d) => (visible.has(d) ? String(d) : '')
				};
			} else {
				opts.x = { ...xScale, ticks: xTicks };
			}
		}

		// Apply x-axis label rotation if configured
		if (xTickRotate !== 0) {
			opts.x = { ...(opts.x || {}), tickRotate: xTickRotate };
		}

		// Apply bottom margin for x-axis label space
		if (marginBottom > 0) {
			opts.marginBottom = marginBottom;
		}

		// Suppress Plot's built-in axis labels — rendered externally for consistent styling
		opts.x = { ...(opts.x || {}), label: null };
		// Suppress Plot's default y-axis label — rendered externally as a rotated element
		opts.y = { ...(opts.y || {}), label: null };

		// Apply plot overrides before tooltips
		if (plotOverrides) {
			opts = applyPlotOverrides(opts, plotOverrides);
		}

		// Add tooltip marks
		// When colour series is active, show all data columns (including the colour column)
		const tooltipLabels =
			colourSeries && Object.keys(dataColumnLabels).length > 0
				? dataColumnLabels
				: Object.fromEntries(seriesNames.map((n) => [n, seriesLabels[n] || n]));
		const channels = Object.fromEntries(
			Object.entries(tooltipLabels).map(([key, label]) => [label, key])
		);

		if (TIME_SERIES_TYPES.has(chartType)) {
			opts.marks.push(
				ruleX(data, pointerX({ x: 'date', stroke: '#888', strokeWidth: 0.5 })),
				tip(data, pointerX({ x: 'date', channels }))
			);
		} else {
			opts.marks.push(tip(data, pointerX({ x: 'category', channels })));
		}

		// Add annotation marks
		if (annotationResult.marks.length) {
			opts.marks.push(...annotationResult.marks);
		}

		return opts;
	});
</script>

{#if plotOptions}
	<div class="stratify-plot-outer {className}">
		<div class="stratify-plot-wrapper">
			{#if yLabel}
				<span class="stratify-axis-label stratify-y-label">{yLabel}</span>
			{/if}
			<PlotChart options={plotOptions} {height} class="flex-1 min-w-0" />
		</div>
		{#if xLabel}
			<span class="stratify-axis-label stratify-x-label">{xLabel}</span>
		{/if}
	</div>
{/if}

<style>
	.stratify-plot-wrapper {
		display: flex;
		align-items: stretch;
	}

	.stratify-axis-label {
		font-size: 11px;
		color: #888;
		white-space: nowrap;
	}

	.stratify-y-label {
		writing-mode: vertical-lr;
		transform: rotate(180deg);
		display: flex;
		align-items: center;
		justify-content: center;
		padding-right: 4px;
	}

	.stratify-x-label {
		display: block;
		text-align: center;
		padding-top: 4px;
	}
</style>
