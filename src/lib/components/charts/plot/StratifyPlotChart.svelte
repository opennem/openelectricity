<script>
	import PlotChart from './PlotChart.svelte';
	import { ruleX, tip, pointerX } from '@observablehq/plot';
	import {
		createStackedAreaOptions,
		createLineOptions,
		createStackedBarOptions,
		createGroupedBarOptions,
		createDotOptions,
		createMixedMarkOptions
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

	/**
	 * @type {{
	 *   data: Array<Record<string, any>>,
	 *   seriesNames: string[],
	 *   seriesColours: Record<string, string>,
	 *   seriesLabels: Record<string, string>,
	 *   chartType: StratifyPlotChartType,
	 *   seriesChartTypes?: Record<string, string>,
	 *   plotOverrides?: import('./plot-overrides.js').PlotOverrides | null,
	 *   height?: number,
	 *   xTicks?: number,
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
		height = 300,
		xTicks = 0,
		options = {},
		annotations = [],
		class: className = ''
	} = $props();

	let plotOptions = $derived.by(() => {
		if (!data.length || !seriesNames.length) return null;

		// Process annotations to get extra marks and margin adjustments
		const annotationResult = annotations.length
			? processAnnotations(annotations, data, seriesNames, seriesColours, seriesLabels, chartType, height)
			: { marks: [], marginRight: 0 };

		// Merge annotation margin with user options
		const mergedOptions =
			annotationResult.marginRight > 0
				? {
						...options,
						marginRight: Math.max(options.marginRight ?? 0, annotationResult.marginRight)
					}
				: options;

		const hasMixedTypes = Object.keys(seriesChartTypes).length > 0;
		let opts = hasMixedTypes
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

		// Apply x-axis tick count if configured
		if (xTicks > 0) {
			const xScale = opts.x || {};
			if (xScale.type === 'band') {
				// Band scales ignore `ticks` — use tickFormat to hide labels
				const domain = xScale.domain || data.map((/** @type {any} */ d) => d.category);
				const step = Math.max(1, Math.ceil(domain.length / xTicks));
				const visible = new Set(domain.filter((/** @type {any} */ _, /** @type {number} */ i) => i % step === 0));
				opts.x = { ...xScale, tickFormat: (/** @type {any} */ d) => visible.has(d) ? String(d) : '' };
			} else {
				opts.x = { ...xScale, ticks: xTicks };
			}
		}

		// Apply plot overrides before tooltips
		if (plotOverrides) {
			opts = applyPlotOverrides(opts, plotOverrides);
		}

		// Add tooltip marks
		if (TIME_SERIES_TYPES.has(chartType)) {
			const channels = Object.fromEntries(
				seriesNames.map((name) => [seriesLabels[name] || name, name])
			);
			opts.marks.push(
				ruleX(data, pointerX({ x: 'date', stroke: '#888', strokeWidth: 0.5 })),
				tip(data, pointerX({ x: 'date', channels }))
			);
		} else {
			const channels = Object.fromEntries(
				seriesNames.map((name) => [seriesLabels[name] || name, name])
			);
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
	<PlotChart options={plotOptions} {height} class={className} />
{/if}
