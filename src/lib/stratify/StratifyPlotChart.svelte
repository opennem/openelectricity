<script>
	import PlotChart from '$lib/components/charts/plot/PlotChart.svelte';
	import { ruleX, tip, pointerX, axisY } from '@observablehq/plot';
	import { scaleLinear } from 'd3-scale';
	import {
		createStackedAreaOptions,
		createLineOptions,
		createStackedBarOptions,
		createGroupedBarOptions,
		createHorizontalBarOptions,
		createGroupedHorizontalBarOptions,
		createColourGroupedBarOptions,
		buildTooltipChannels
	} from '$lib/components/charts/plot/plot-configs.js';
	import { processAnnotations, formatCompact } from './plot-annotations.js';
	import { applyPlotOverrides } from './plot-overrides.js';
	import {
		HORIZONTAL_TYPES,
		COLUMN_TYPES,
		TIME_SERIES_TYPES
	} from '$lib/stratify/chart-types.js';

	const dateFmt = new Intl.DateTimeFormat('en-AU', {
		day: 'numeric',
		month: 'short',
		year: 'numeric'
	});

	/** @type {Record<string, Function>} */
	const CONFIG_MAP = {
		area: createStackedAreaOptions,
		line: createLineOptions,
		column: createStackedBarOptions,
		'column-stacked': createStackedBarOptions,
		'column-grouped': createGroupedBarOptions,
		bar: createHorizontalBarOptions,
		'bar-stacked': createHorizontalBarOptions,
		'bar-grouped': createGroupedHorizontalBarOptions
	};

	const BAR_TYPES = new Set([...HORIZONTAL_TYPES, ...COLUMN_TYPES]);

	/**
	 * @type {{
	 *   data: Array<Record<string, any>>,
	 *   seriesNames: string[],
	 *   seriesColours: Record<string, string>,
	 *   seriesLabels: Record<string, string>,
	 *   chartType: import('$lib/stratify/chart-types.js').ChartType,
	 *   plotOverrides?: import('./plot-overrides.js').PlotOverrides | null,
	 *   colourSeries?: string | null,
	 *   colourGroupNames?: string[],
	 *   dataColumnLabels?: Record<string, string>,
	 *   height?: number,
	 *   xLabel?: string,
	 *   yLabel?: string,
	 *   y2Label?: string,
	 *   seriesYAxis?: Record<string, 'left' | 'right'>,
	 *   yTicks?: number,
	 *   yMinMax?: boolean,
	 *   y2Ticks?: number,
	 *   y2MinMax?: boolean,
	 *   tooltipColumns?: string[],
	 *   dateColumnKey?: string,
	 *   dateColumnLabel?: string,
	 *   xDomain?: string[],
	 *   showXTickLabels?: boolean,
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
		plotOverrides = null,
		colourSeries = null,
		colourGroupNames = [],
		dataColumnLabels = {},
		height = 300,
		xLabel = '',
		yLabel = '',
		y2Label = '',
		seriesYAxis = {},
		yTicks = 0,
		yMinMax = false,
		y2Ticks = 0,
		y2MinMax = false,
		tooltipColumns = [],
		dateColumnKey = '',
		dateColumnLabel = '',
		xDomain = undefined,
		showXTickLabels = true,
		xTicks = 0,
		xTickRotate = 0,
		marginBottom = 0,
		options = {},
		annotations = [],
		class: className = ''
	} = $props();

	// Detect right-axis series
	const rightAxisSeries = $derived(
		Object.entries(seriesYAxis)
			.filter(([, axis]) => axis === 'right')
			.map(([name]) => name)
			.filter((name) => seriesNames.includes(name))
	);
	const hasRightAxis = $derived(rightAxisSeries.length > 0);

	let plotOptions = $derived.by(() => {
		if (!data.length || !seriesNames.length) return null;

		// --- Dual Y-axis: rescale right-axis series data ---
		let chartData = data;
		/** @type {import('d3-scale').ScaleLinear<number, number> | null} */
		let y2Scale = null;

		if (hasRightAxis) {
			const leftSeries = seriesNames.filter((n) => !rightAxisSeries.includes(n));
			const rightSet = new Set(rightAxisSeries);

			// Single pass: compute domains for both axes
			let leftMin = Infinity,
				leftMax = -Infinity;
			let rightMin = Infinity,
				rightMax = -Infinity;

			for (const row of data) {
				for (const name of seriesNames) {
					const v = row[name];
					if (v == null || !isFinite(v)) continue;
					if (rightSet.has(name)) {
						if (v < rightMin) rightMin = v;
						if (v > rightMax) rightMax = v;
					} else {
						if (v < leftMin) leftMin = v;
						if (v > leftMax) leftMax = v;
					}
				}
			}

			if (leftMin > 0) leftMin = 0;
			if (rightMin > 0) rightMin = 0;

			y2Scale = scaleLinear().domain([rightMin, rightMax]).range([leftMin, leftMax]);

			// Rescale right-axis data to fit the left-axis domain
			const scale = y2Scale;
			chartData = data.map((row) => {
				const newRow = { ...row };
				for (const name of rightAxisSeries) {
					if (newRow[name] != null) newRow[name] = scale(newRow[name]);
				}
				return newRow;
			});
		}

		// Process annotations to get extra marks and margin adjustments
		const annotationResult = annotations.length
			? processAnnotations(
					annotations,
					chartData,
					seriesNames,
					seriesColours,
					seriesLabels,
					chartType,
					height
				)
			: { marks: [], marginRight: 0 };

		// Merge annotation margin with user options
		const baseMarginRight = hasRightAxis ? 40 : 0;
		const mergedOptions =
			annotationResult.marginRight > 0 || baseMarginRight > 0
				? {
						...options,
						marginRight: Math.max(
							options.marginRight ?? 0,
							annotationResult.marginRight,
							baseMarginRight
						)
					}
				: options;

		// Use colour-grouped bar when a colour series is active and chart is a bar type
		let opts;
		if (colourSeries && colourGroupNames.length > 0 && BAR_TYPES.has(chartType)) {
			opts = createColourGroupedBarOptions(
				chartData,
				seriesNames[0],
				colourGroupNames,
				seriesColours,
				seriesLabels,
				colourSeries,
				mergedOptions
			);
		} else {
			opts = (CONFIG_MAP[chartType] || createLineOptions)(
						chartData,
						seriesNames,
						seriesColours,
						seriesLabels,
						mergedOptions
					);
		}

		if (hasRightAxis && y2Scale) {
			const scale = y2Scale;

			// Build right-axis tick options
			/** @type {Record<string, any>} */
			const rightAxisOpts = {
				anchor: 'right',
				label: null,
				tickFormat: (/** @type {number} */ v) => formatCompact(scale.invert(v))
			};
			if (y2MinMax) {
				// Use domain endpoints as ticks (in left-axis space)
				const [rMin, rMax] = scale.domain();
				rightAxisOpts.ticks = [scale(rMin), scale(rMax)];
			} else if (y2Ticks > 0) {
				rightAxisOpts.ticks = y2Ticks;
			}

			// Build left-axis tick options
			/** @type {Record<string, any>} */
			const leftAxisOpts = { anchor: 'left', label: null };
			if (yMinMax) {
				const leftSeries = seriesNames.filter((n) => !rightAxisSeries.includes(n));
				let min = Infinity,
					max = -Infinity;
				for (const row of chartData) {
					for (const name of leftSeries) {
						const v = row[name];
						if (v != null && isFinite(v)) {
							if (v < min) min = v;
							if (v > max) max = v;
						}
					}
				}
				if (min > 0) min = 0;
				if (isFinite(min) && isFinite(max)) leftAxisOpts.ticks = [min, max];
			} else if (yTicks > 0) {
				leftAxisOpts.ticks = yTicks;
			}

			opts.marks.push(axisY(rightAxisOpts));
			// Suppress the default left axis and re-add it explicitly,
			// so both left and right axes render
			opts.y = { ...(opts.y || {}), axis: null };
			opts.marks.push(axisY(leftAxisOpts));
		} else {
			// Single Y-axis: apply ticks and min/max
			if (yMinMax) {
				let min = Infinity,
					max = -Infinity;
				for (const row of chartData) {
					for (const name of seriesNames) {
						const v = row[name];
						if (v != null && isFinite(v)) {
							if (v < min) min = v;
							if (v > max) max = v;
						}
					}
				}
				if (min > 0) min = 0;
				if (isFinite(min) && isFinite(max)) {
					opts.y = { ...(opts.y || {}), ticks: [min, max] };
				}
			} else if (yTicks > 0) {
				opts.y = { ...(opts.y || {}), ticks: yTicks };
			}
		}

		// Apply explicit x domain (e.g. sorted categories)
		if (xDomain) {
			opts.x = { ...(opts.x || {}), domain: xDomain };
		}

		// Apply x-axis tick count if configured (before showXTickLabels so it can override)
		if (xTicks > 0) {
			const xScale = opts.x || {};
			if (xScale.type === 'band') {
				const domain =
					xScale.domain || chartData.map((/** @type {any} */ d) => d.category ?? d.date);
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

		// Hide x-axis tick labels if disabled (after xTicks so it takes precedence)
		if (!showXTickLabels) {
			opts.x = { ...(opts.x || {}), tickFormat: () => '' };
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

		// Add single tooltip mark with filtered channels
		const isTimeSeries = data.length > 0 && 'date' in data[0];

		// Build series tooltip labels
		let tooltipLabels =
			colourSeries && Object.keys(dataColumnLabels).length > 0
				? dataColumnLabels
				: Object.fromEntries(seriesNames.map((n) => [n, seriesLabels[n] || n]));

		if (isTimeSeries) {
			// Build channels in tooltipColumns order, interleaving Date at the right position
			const showDate =
				tooltipColumns.length === 0 || (dateColumnKey && tooltipColumns.includes(dateColumnKey));

			/** @type {Record<string, any>} */
			const tipChannels = {};

			if (tooltipColumns.length > 0) {
				for (const key of tooltipColumns) {
					if (key === dateColumnKey && showDate) {
						tipChannels.Date = {
							value: (/** @type {any} */ d) => dateFmt.format(d.date)
						};
					} else if (key in tooltipLabels) {
						const label = tooltipLabels[key];
						tipChannels[label] = key;
					}
				}
			} else {
				if (showDate) {
					tipChannels.Date = {
						value: (/** @type {any} */ d) => dateFmt.format(d.date)
					};
				}
				const channels = buildTooltipChannels(tooltipLabels);
				Object.assign(tipChannels, channels);
			}

			opts.marks.push(
				ruleX(data, pointerX({ x: 'date', stroke: '#888', strokeWidth: 0.5 })),
				tip(
					data,
					pointerX({
						x: 'date',
						channels: tipChannels,
						format: { x: false },
						lineHeight: 1.3,
						fontSize: 11
					})
				)
			);
		} else {
			// Category mode: build channels in order with proper column label
			/** @type {Record<string, any>} */
			const tipChannels = {};
			const catColumnKey = dateColumnKey; // first column key
			const catLabel = dateColumnLabel || 'Category';
			const showCat =
				tooltipColumns.length === 0 || (catColumnKey && tooltipColumns.includes(catColumnKey));

			if (tooltipColumns.length > 0) {
				for (const key of tooltipColumns) {
					if (key === catColumnKey && showCat) {
						tipChannels[catLabel] = { value: (/** @type {any} */ d) => d.category };
					} else if (key in tooltipLabels) {
						tipChannels[tooltipLabels[key]] = key;
					}
				}
			} else {
				if (showCat) {
					tipChannels[catLabel] = { value: (/** @type {any} */ d) => d.category };
				}
				Object.assign(tipChannels, buildTooltipChannels(tooltipLabels));
			}

			opts.marks.push(
				tip(
					data,
					pointerX({
						x: 'category',
						channels: tipChannels,
						format: { x: false },
						lineHeight: 1.3,
						fontSize: 11
					})
				)
			);
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
			{#if y2Label}
				<span class="stratify-axis-label stratify-y2-label">{y2Label}</span>
			{/if}
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

	.stratify-y2-label {
		writing-mode: vertical-lr;
		display: flex;
		align-items: center;
		justify-content: center;
		padding-left: 4px;
	}

	.stratify-x-label {
		display: block;
		text-align: center;
		padding-top: 4px;
	}
</style>
