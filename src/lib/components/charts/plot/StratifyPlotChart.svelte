<script>
	import PlotChart from './PlotChart.svelte';
	import { ruleX, tip, pointerX } from '@observablehq/plot';
	import {
		createStackedAreaOptions,
		createLineOptions,
		createStackedBarOptions,
		createGroupedBarOptions
	} from './plot-configs.js';
	import { processAnnotations } from './plot-annotations.js';

	/**
	 * @typedef {'stacked-area' | 'area' | 'line' | 'bar-stacked' | 'grouped-bar'} StratifyPlotChartType
	 */

	/** @type {Record<string, Function>} */
	const CONFIG_MAP = {
		'stacked-area': createStackedAreaOptions,
		area: createStackedAreaOptions,
		line: createLineOptions,
		'bar-stacked': createStackedBarOptions,
		'grouped-bar': createGroupedBarOptions
	};

	const TIME_SERIES_TYPES = new Set(['stacked-area', 'area', 'line']);

	/**
	 * @type {{
	 *   data: Array<Record<string, any>>,
	 *   seriesNames: string[],
	 *   seriesColours: Record<string, string>,
	 *   seriesLabels: Record<string, string>,
	 *   chartType: StratifyPlotChartType,
	 *   height?: number,
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
		height = 300,
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

		const configFn = CONFIG_MAP[chartType] || createLineOptions;
		const opts = configFn(data, seriesNames, seriesColours, seriesLabels, mergedOptions);

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
