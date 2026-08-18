<script>
	import PlotChart from '$lib/components/charts/plot/PlotChart.svelte';
	import { ruleX, ruleY, tip, pointer, pointerX, pointerY, axisY } from '@observablehq/plot';
	import { scaleLinear } from 'd3-scale';
	import {
		createStackedAreaOptions,
		createLineOptions,
		createScatterOptions,
		createStackedBarOptions,
		createGroupedBarOptions,
		createHorizontalBarOptions,
		createGroupedHorizontalBarOptions,
		createColourGroupedBarOptions,
		createWaterfallOptions,
		createMixedMarkOptions,
		buildTooltipChannels,
		makeValueFormatter,
		buildScatterData,
		toLong,
		buildFacetGrid,
		withFacetFields,
		FACET_X_FIELD,
		FACET_Y_FIELD
	} from '$lib/components/charts/plot/plot-configs.js';
	import { processAnnotations, processDataAnnotations, formatCompact } from './plot-annotations.js';
	import { DEFAULT_ANNOTATION_STYLE } from './annotation-data.js';
	import { applyPlotOverrides } from './plot-overrides.js';
	import { uniqueColumnValues } from './chart-data.js';
	import {
		createAustralianDateAxisFormatter,
		createAustralianDateAxisTicks,
		formatTooltipDate
	} from './tooltip-date.js';
	import {
		HORIZONTAL_TYPES,
		COLUMN_TYPES,
		TIME_SERIES_TYPES,
		GROUPED_TYPES,
		WATERFALL_TYPES
	} from '$lib/stratify/chart-types.js';

	// Hide the synthetic facet channels (data fields and Plot's scale names)
	// from every tooltip — Plot inherits both on tip marks in faceted charts.
	const TIP_HIDE_FACET = {
		fx: false,
		fy: false,
		[FACET_X_FIELD]: false,
		[FACET_Y_FIELD]: false
	};

	/** @type {Record<string, Function>} */
	const CONFIG_MAP = {
		area: createStackedAreaOptions,
		line: createLineOptions,
		scatter: createScatterOptions,
		column: createStackedBarOptions,
		'column-stacked': createStackedBarOptions,
		'column-grouped': createGroupedBarOptions,
		bar: createHorizontalBarOptions,
		'bar-stacked': createHorizontalBarOptions,
		'bar-grouped': createGroupedHorizontalBarOptions,
		waterfall: createWaterfallOptions,
		'waterfall-horizontal': createWaterfallOptions
	};

	/**
	 * @type {{
	 *   data: Array<Record<string, any>>,
	 *   seriesNames: string[],
	 *   seriesColours: Record<string, string>,
	 *   seriesLabels: Record<string, string>,
	 *   chartType: import('$lib/stratify/chart-types.js').ChartType,
	 *   waterfallMode?: 'single' | 'sum' | 'stacked',
	 *   waterfallShowTotal?: boolean,
	 *   waterfallColourMode?: 'semantic' | 'series',
	 *   waterfallRowColours?: Record<string, string>,
	 *   waterfallRowLabels?: Record<string, string>,
	 *   waterfallSemanticColours?: Record<string, string>,
	 *   waterfallSemanticLabels?: Record<string, string>,
	 *   valueFormat?: string,
	 *   seriesChartTypes?: Record<string, string>,
	 *   seriesLineStyles?: Record<string, string>,
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
	 *   y1Min?: number | null,
	 *   y1Max?: number | null,
	 *   y2Ticks?: number,
	 *   y2MinMax?: boolean,
	 *   y2Min?: number | null,
	 *   y2Max?: number | null,
	 *   tooltipColumns?: string[],
	 *   tooltipDateFormat?: 'date' | 'time' | 'date-time',
	 *   dateColumnKey?: string,
	 *   dateColumnLabel?: string,
	 *   xDomain?: string[],
	 *   yDomain?: string[],
	 *   showXTickLabels?: boolean,
	 *   showLegend?: boolean,
	 *   lineRangeMinColumn?: string | null,
	 *   lineRangeMaxColumn?: string | null,
	 *   lineRangeOpacity?: number,
	 *   scatterSizeColumn?: string | null,
	 *   scatterPointRadius?: number,
	 *   scatterMinRadius?: number,
	 *   scatterMaxRadius?: number,
	 *   scatterPointOpacity?: number,
	 *   facetColumn?: string | null,
	 *   facetPanelsPerRow?: number,
	 *   xTicks?: number,
	 *   xTickRotate?: number,
	 *   marginBottom?: number,
	 *   marginLeft?: number,
	 *   options?: import('$lib/components/charts/plot/plot-configs.js').TimeSeriesOptions,
	 *   annotations?: import('./plot-annotations.js').Annotation[],
	 *   dataAnnotations?: import('./annotation-data.js').DataAnnotation[],
	 *   annotationStyle?: import('./annotation-data.js').AnnotationStyleConfig,
	 *   annotationFontFamily?: string,
	 *   class?: string
	 * }}
	 */
	let {
		data,
		seriesNames,
		seriesColours,
		seriesLabels,
		chartType,
		waterfallMode = 'single',
		waterfallShowTotal = true,
		waterfallColourMode = 'semantic',
		waterfallRowColours = {},
		waterfallRowLabels = {},
		waterfallSemanticColours = {},
		waterfallSemanticLabels = {},
		valueFormat = '1',
		seriesChartTypes = {},
		seriesLineStyles = {},
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
		y1Min = null,
		y1Max = null,
		y2Ticks = 0,
		y2MinMax = false,
		y2Min = null,
		y2Max = null,
		tooltipColumns = [],
		tooltipDateFormat = 'date',
		dateColumnKey = '',
		dateColumnLabel = '',
		xDomain = undefined,
		yDomain = undefined,
		showXTickLabels = true,
		showLegend = true,
		lineRangeMinColumn = null,
		lineRangeMaxColumn = null,
		lineRangeOpacity = 0.2,
		scatterSizeColumn = null,
		scatterPointRadius = 4,
		scatterMinRadius = 3,
		scatterMaxRadius = 18,
		scatterPointOpacity = 0.7,
		facetColumn = null,
		facetPanelsPerRow = 0,
		xTicks = 0,
		xTickRotate = 0,
		marginBottom = 0,
		marginLeft = 0,
		options = {},
		annotations = [],
		dataAnnotations = [],
		annotationStyle = DEFAULT_ANNOTATION_STYLE,
		annotationFontFamily = 'DM Mono, monospace',
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
	const lineRangeColumns = $derived(
		chartType === 'line' &&
			lineRangeMinColumn &&
			lineRangeMaxColumn &&
			lineRangeMinColumn !== lineRangeMaxColumn
			? [lineRangeMinColumn, lineRangeMaxColumn]
			: []
	);

	// --- Facet grid layout (small multiples wrap into 2-D grid) ---
	const MIN_PANEL_WIDTH = 250;
	let containerWidth = $state(0);

	const facetValues = $derived(uniqueColumnValues(data, facetColumn));

	const facetGrid = $derived.by(() => {
		if (!facetColumn || facetValues.length === 0 || containerWidth === 0) return null;
		const n = facetValues.length;
		// Explicit override: use exactly that many columns (clamped to n).
		if (facetPanelsPerRow > 0) {
			return buildFacetGrid(facetValues, Math.min(facetPanelsPerRow, n));
		}
		const maxCols = Math.max(1, Math.floor(containerWidth / MIN_PANEL_WIDTH));
		// Pick the largest divisor of n at or below maxCols so the grid has
		// no empty cells — Plot otherwise draws the perimeter axes into the
		// empty cell as a phantom chart.
		let cols = Math.min(maxCols, n);
		for (let c = cols; c >= 1; c--) {
			if (n % c === 0) {
				cols = c;
				break;
			}
		}
		return buildFacetGrid(facetValues, cols);
	});

	/** Effective chart height — multiplied by row count when faceting wraps into a grid. */
	const effectiveHeight = $derived(facetGrid ? height * facetGrid.rows : height);

	let plotOptions = $derived.by(() => {
		if (!data.length || !seriesNames.length) return null;
		const isTimeSeriesData = 'date' in data[0];

		// --- Dual Y-axis: rescale right-axis series data ---
		let chartData = data;
		/** @type {import('d3-scale').ScaleLinear<number, number> | null} */
		let y2Scale = null;

		if (hasRightAxis) {
			const leftSeries = seriesNames.filter((n) => !rightAxisSeries.includes(n));
			const rightSet = new Set(rightAxisSeries);
			const rangeOnRight = rightSet.has(seriesNames[0]);

			// Single pass: compute domains for both axes
			let leftMin = Infinity,
				leftMax = -Infinity;
			let rightMin = Infinity,
				rightMax = -Infinity;

			for (const row of data) {
				for (const name of [...seriesNames, ...lineRangeColumns]) {
					const v = row[name];
					if (v == null || !isFinite(v)) continue;
					if (rightSet.has(name) || (lineRangeColumns.includes(name) && rangeOnRight)) {
						if (v < rightMin) rightMin = v;
						if (v > rightMax) rightMax = v;
					} else {
						if (v < leftMin) leftMin = v;
						if (v > leftMax) leftMax = v;
					}
				}
			}

			// Clamp auto-computed bounds to include zero; skip the clamp
			// when the user has provided an explicit bound on that side.
			if (y1Min == null && leftMin > 0) leftMin = 0;
			if (y2Min == null && rightMin > 0) rightMin = 0;

			const leftLo = y1Min != null ? y1Min : leftMin;
			const leftHi = y1Max != null ? y1Max : leftMax;
			const rightLo = y2Min != null ? y2Min : rightMin;
			const rightHi = y2Max != null ? y2Max : rightMax;

			y2Scale = scaleLinear().domain([rightLo, rightHi]).range([leftLo, leftHi]);

			// Rescale right-axis data to fit the left-axis domain
			const scale = y2Scale;
			chartData = data.map((row) => {
				const newRow = { ...row };
				for (const name of rightAxisSeries) {
					if (newRow[name] != null) newRow[name] = scale(newRow[name]);
				}
				if (rangeOnRight) {
					for (const name of lineRangeColumns) {
						if (newRow[name] != null) newRow[name] = scale(newRow[name]);
					}
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
					height,
					{ fontFamily: annotationFontFamily }
				)
			: { marks: [], marginRight: 0 };
		const dataAnnotationResult = processDataAnnotations(
			dataAnnotations,
			chartData,
			seriesNames,
			seriesLabels,
			annotationStyle,
			containerWidth || 640,
			y2Scale ? (value) => /** @type {NonNullable<typeof y2Scale>} */ (y2Scale)(value) : undefined,
			annotationFontFamily
		);

		// Merge annotation margin with user options
		const baseMarginRight = hasRightAxis ? 40 : 0;
		const mergedOptions = {
			...options,
			...(annotationResult.marginRight > 0 || baseMarginRight > 0
				? {
						marginRight: Math.max(
							options.marginRight ?? 0,
							annotationResult.marginRight,
							baseMarginRight
						)
					}
				: {})
		};

		// Include line styles so rendering functions can apply per-series dash patterns.
		// Inject legend visibility — overrides the per-factory default (true).
		// Inject facetColumn + facetGrid so each factory can route data into a
		// 2-D wrapped grid of small-multiple panels.
		const optionsWithLineStyles = {
			...mergedOptions,
			seriesLineStyles,
			legend: showLegend,
			lineRangeMinColumn: lineRangeColumns[0] ?? null,
			lineRangeMaxColumn: lineRangeColumns[1] ?? null,
			lineRangeOpacity,
			scatterSizeColumn,
			scatterPointRadius,
			scatterMinRadius,
			scatterMaxRadius,
			scatterPointOpacity,
			facetColumn,
			facetGrid,
			waterfallMode,
			waterfallHorizontal: chartType === 'waterfall-horizontal',
			waterfallShowTotal,
			waterfallColourMode,
			waterfallRowColours,
			waterfallRowLabels,
			waterfallSemanticColours,
			waterfallSemanticLabels,
			colourSeries,
			colourGroupNames,
			valueFormat
		};

		const isWaterfall = WATERFALL_TYPES.has(chartType);
		const isBarType =
			!isWaterfall && (HORIZONTAL_TYPES.has(chartType) || COLUMN_TYPES.has(chartType));
		let opts;
		if (colourSeries && colourGroupNames.length > 0 && isBarType) {
			opts = createColourGroupedBarOptions(
				chartData,
				seriesNames[0],
				colourGroupNames,
				seriesColours,
				seriesLabels,
				colourSeries,
				{ ...optionsWithLineStyles, horizontal: HORIZONTAL_TYPES.has(chartType) }
			);
		} else {
			const hasMixedTypes = !isWaterfall && Object.keys(seriesChartTypes).length > 0;
			opts = hasMixedTypes
				? createMixedMarkOptions(
						chartData,
						seriesNames,
						seriesColours,
						seriesLabels,
						/** @type {Record<string, import('$lib/components/charts/plot/plot-configs.js').SeriesMarkType>} */ (
							seriesChartTypes
						),
						chartType,
						optionsWithLineStyles
					)
				: (CONFIG_MAP[chartType] || createLineOptions)(
						chartData,
						seriesNames,
						seriesColours,
						seriesLabels,
						optionsWithLineStyles
					);
		}

		if (dataAnnotationResult.marginTop > 0) {
			opts.marginTop = Math.max(opts.marginTop ?? 0, dataAnnotationResult.marginTop);
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
			const leftAxisOpts = {
				anchor: 'left',
				label: null,
				tickFormat: formatCompact
			};
			if (yMinMax) {
				const leftSeries = [
					...seriesNames.filter((n) => !rightAxisSeries.includes(n)),
					...lineRangeColumns
				];
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
			// so both left and right axes render. Force the y-scale domain
			// to the (possibly overridden) left-axis bounds.
			opts.y = { ...(opts.y || {}), axis: null, domain: scale.range() };
			opts.marks.push(axisY(leftAxisOpts));
		} else {
			const yScaleType = (opts.y || {}).type;
			const isNumericScale = yScaleType !== 'band' && yScaleType !== 'point';

			if (isNumericScale) {
				opts.y = { ...(opts.y || {}), tickFormat: formatCompact };
			}

			if (yMinMax) {
				let min = Infinity,
					max = -Infinity;
				for (const row of chartData) {
					for (const name of [...seriesNames, ...lineRangeColumns]) {
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
				const yScale = opts.y || {};
				if (yScale.type === 'band') {
					const domain = yScale.domain || chartData.map((/** @type {any} */ d) => d.category);
					const step = Math.max(1, Math.ceil(domain.length / yTicks));
					const visibleTicks = domain.filter(
						(/** @type {any} */ _, /** @type {number} */ i) => i % step === 0
					);
					opts.y = { ...yScale, ticks: visibleTicks };
				} else {
					opts.y = { ...(opts.y || {}), ticks: yTicks };
				}
			}

			// Skip when an external yDomain is supplied (categorical sort) or the scale is band/point.
			if ((y1Min != null || y1Max != null) && !yDomain && isNumericScale) {
				let lo = y1Min;
				let hi = y1Max;
				if (lo == null || hi == null) {
					let dMin = Infinity,
						dMax = -Infinity;
					for (const row of chartData) {
						for (const name of [...seriesNames, ...lineRangeColumns]) {
							const v = row[name];
							if (v != null && isFinite(v)) {
								if (v < dMin) dMin = v;
								if (v > dMax) dMax = v;
							}
						}
					}
					if (lo == null) lo = isFinite(dMin) ? (dMin > 0 ? 0 : dMin) : 0;
					if (hi == null) hi = isFinite(dMax) ? dMax : 1;
				}
				opts.y = { ...(opts.y || {}), domain: [lo, hi] };
			}
		}

		// Apply explicit domain (e.g. sorted categories). For grouped charts the
		// category axis is the facet scale (fx for vertical, fy for horizontal),
		// not the inner positional scale that holds seriesNames.
		// Waterfall sets its own band domain (incl. the synthetic 'Total' entry),
		// so skip the categorical-sort override that would drop the Total bar.
		const isGrouped = GROUPED_TYPES.has(chartType);
		if (xDomain && !isWaterfall) {
			if (isGrouped) {
				opts.fx = { ...(opts.fx || {}), domain: xDomain };
			} else {
				opts.x = { ...(opts.x || {}), domain: xDomain };
			}
		}
		if (yDomain && !isWaterfall) {
			if (isGrouped) {
				opts.fy = { ...(opts.fy || {}), domain: yDomain };
			} else {
				opts.y = { ...(opts.y || {}), domain: yDomain };
			}
		}

		// Observable Plot defaults temporal ticks to U.S. English. Apply one
		// explicit en-AU policy to every scale that can carry the CSV date axis.
		if (isTimeSeriesData) {
			const dateTickFormat = createAustralianDateAxisFormatter(data);
			const dateTicks = createAustralianDateAxisTicks(data, xTicks || 8);
			const dateScaleKey =
				chartType === 'waterfall-horizontal' || chartType === 'bar' || chartType === 'bar-stacked'
					? 'y'
					: chartType === 'bar-grouped'
						? 'fy'
						: chartType === 'column-grouped'
							? facetColumn
								? 'fy'
								: 'fx'
							: 'x';
			const scale = opts[dateScaleKey] || {};
			const existingTickFormat = scale.tickFormat;
			const nonDateTicks = Array.isArray(scale.domain)
				? scale.domain.filter((/** @type {any} */ value) => !(value instanceof Date))
				: [];
			opts[dateScaleKey] = {
				...scale,
				ticks: [...dateTicks, ...nonDateTicks],
				tickFormat: (/** @type {any} */ value) =>
					value instanceof Date
						? dateTickFormat(value)
						: typeof existingTickFormat === 'function'
							? existingTickFormat(value)
							: String(value)
			};
		}

		// Apply x-axis tick count if configured (before showXTickLabels so it can override)
		if (xTicks > 0 && !isTimeSeriesData) {
			const xScale = opts.x || {};
			if (xScale.type === 'band' || xScale.type === 'point') {
				const domain =
					xScale.domain || chartData.map((/** @type {any} */ d) => d.category ?? d.date);
				const step = Math.max(1, Math.ceil(domain.length / xTicks));
				const visibleTicks = domain.filter(
					(/** @type {any} */ _, /** @type {number} */ i) => i % step === 0
				);
				opts.x = { ...xScale, ticks: visibleTicks };
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

		// Apply left margin for y-axis label space
		if (marginLeft > 0) {
			opts.marginLeft = marginLeft;
		}

		// Suppress Plot's built-in axis labels — rendered externally for consistent styling
		opts.x = { ...(opts.x || {}), label: null };
		// Suppress Plot's default y-axis label — rendered externally as a rotated element
		opts.y = { ...(opts.y || {}), label: null };

		// Apply plot overrides before tooltips
		if (plotOverrides) {
			opts = applyPlotOverrides(opts, plotOverrides);
		}

		if (dataAnnotationResult.backgroundMarks.length) {
			opts.marks.unshift(...dataAnnotationResult.backgroundMarks);
		}
		if (dataAnnotationResult.foregroundMarks.length) {
			opts.marks.push(...dataAnnotationResult.foregroundMarks);
		}

		// Add single tooltip mark with filtered channels
		const isTimeSeries = isTimeSeriesData;
		const isLinear = data.length > 0 && 'linear' in data[0];

		// Formats displayed series values in every tooltip (waterfall supplies its own).
		const formatValue = makeValueFormatter(valueFormat);
		const tooltipData = withFacetFields(data, facetColumn, facetGrid);
		const tooltipFacet = facetColumn
			? facetGrid
				? { fx: FACET_X_FIELD, fy: FACET_Y_FIELD }
				: { fx: 'facet' }
			: {};

		// Build series tooltip labels
		let tooltipLabels =
			colourSeries && Object.keys(dataColumnLabels).length > 0
				? dataColumnLabels
				: Object.fromEntries(seriesNames.map((n) => [n, seriesLabels[n] || n]));
		if (chartType === 'line') {
			for (const key of lineRangeColumns) {
				tooltipLabels[key] = dataColumnLabels[key] || key;
			}
		}

		if (isWaterfall) {
			// createWaterfallOptions supplies its own tooltip (Category / Change / Total)
			// bound to the precomputed cumulative bars, so skip the generic channels.
		} else if (chartType === 'scatter') {
			const xKey = isTimeSeries ? 'date' : isLinear ? 'linear' : 'category';
			const scatterPoints = buildScatterData(chartData, seriesNames, xKey, {
				sizeColumn: scatterSizeColumn,
				pointRadius: scatterPointRadius,
				minRadius: scatterMinRadius,
				maxRadius: scatterMaxRadius,
				facetColumn,
				facetGrid
			});
			for (const point of scatterPoints) {
				point.displayValue = data[point.rowIndex]?.[point.series];
			}
			const xColumnLabel = dateColumnLabel || (isTimeSeries ? 'Date' : isLinear ? 'X' : 'Category');
			const sizeLabel = scatterSizeColumn
				? dataColumnLabels[scatterSizeColumn] || scatterSizeColumn
				: null;
			const scatterChannels = {
				Series: {
					value: (/** @type {any} */ d) => seriesLabels[d.series] || d.series
				},
				[xColumnLabel]: {
					value: (/** @type {any} */ d) =>
						isTimeSeries
							? formatTooltipDate(d.x, tooltipDateFormat, data[d.rowIndex]?._dateStr ?? null)
							: d.x
				},
				Y: { value: (/** @type {any} */ d) => formatValue(d.displayValue) },
				...(sizeLabel
					? { [sizeLabel]: { value: (/** @type {any} */ d) => formatValue(d.sizeValue) } }
					: {})
			};
			const scatterFacet = facetColumn
				? facetGrid
					? { fx: FACET_X_FIELD, fy: FACET_Y_FIELD }
					: { fx: 'facet' }
				: {};
			opts.marks.push(
				tip(
					scatterPoints,
					pointer({
						x: 'x',
						y: 'value',
						...scatterFacet,
						channels: scatterChannels,
						format: { x: false, y: false, ...TIP_HIDE_FACET },
						lineHeight: 1.3,
						fontSize: 11
					})
				)
			);
		} else if (isTimeSeries) {
			// Build channels in tooltipColumns order, interleaving Date at the right position
			const showDate =
				tooltipColumns.length === 0 || (dateColumnKey && tooltipColumns.includes(dateColumnKey));

			/** @type {Record<string, any>} */
			const tipChannels = {};

			if (tooltipColumns.length > 0) {
				for (const key of tooltipColumns) {
					if (key === dateColumnKey && showDate) {
						tipChannels[dateColumnLabel || 'Date'] = {
							value: (/** @type {any} */ d) =>
								formatTooltipDate(d.date, tooltipDateFormat, d._dateStr)
						};
					} else if (key in tooltipLabels) {
						const label = tooltipLabels[key];
						tipChannels[label] = { value: (/** @type {any} */ d) => formatValue(d[key]) };
					}
				}
			} else {
				if (showDate) {
					tipChannels[dateColumnLabel || 'Date'] = {
						value: (/** @type {any} */ d) =>
							formatTooltipDate(d.date, tooltipDateFormat, d._dateStr)
					};
				}
				const channels = buildTooltipChannels(tooltipLabels, formatValue);
				Object.assign(tipChannels, channels);
			}

			opts.marks.push(
				ruleX(
					tooltipData,
					pointerX({ x: 'date', ...tooltipFacet, stroke: '#888', strokeWidth: 0.5 })
				),
				tip(
					tooltipData,
					pointerX({
						x: 'date',
						...tooltipFacet,
						channels: tipChannels,
						format: { x: false, ...TIP_HIDE_FACET },
						lineHeight: 1.3,
						fontSize: 11
					})
				)
			);
		} else if (isLinear) {
			// Linear mode: numeric x-axis with pointer tooltip
			const xColLabel = dateColumnLabel || 'X';
			const showX =
				tooltipColumns.length === 0 || (dateColumnKey && tooltipColumns.includes(dateColumnKey));

			/** @type {Record<string, any>} */
			const tipChannels = {};

			if (tooltipColumns.length > 0) {
				for (const key of tooltipColumns) {
					if (key === dateColumnKey && showX) {
						tipChannels[xColLabel] = { value: (/** @type {any} */ d) => d.linear };
					} else if (key in tooltipLabels) {
						tipChannels[tooltipLabels[key]] = {
							value: (/** @type {any} */ d) => formatValue(d[key])
						};
					}
				}
			} else {
				if (showX) {
					tipChannels[xColLabel] = { value: (/** @type {any} */ d) => d.linear };
				}
				Object.assign(tipChannels, buildTooltipChannels(tooltipLabels, formatValue));
			}

			opts.marks.push(
				ruleX(
					tooltipData,
					pointerX({ x: 'linear', ...tooltipFacet, stroke: '#888', strokeWidth: 0.5 })
				),
				tip(
					tooltipData,
					pointerX({
						x: 'linear',
						...tooltipFacet,
						channels: tipChannels,
						format: { x: false, ...TIP_HIDE_FACET },
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
						tipChannels[tooltipLabels[key]] = {
							value: (/** @type {any} */ d) => formatValue(d[key])
						};
					}
				}
			} else {
				if (showCat) {
					tipChannels[catLabel] = { value: (/** @type {any} */ d) => d.category };
				}
				Object.assign(tipChannels, buildTooltipChannels(tooltipLabels, formatValue));
			}

			const isHz = HORIZONTAL_TYPES.has(chartType);
			if (isGrouped) {
				// Grouped charts render bars in faceted space, so the tooltip
				// must hunt within facets on the long-format data.
				const longData = toLong(data, seriesNames, 'category');
				/** @type {Record<string, any>} */
				const groupedChannels = {};
				if (showCat) {
					groupedChannels[catLabel] = { value: (/** @type {any} */ d) => d.x };
				}
				groupedChannels['Series'] = {
					value: (/** @type {any} */ d) => seriesLabels[d.series] || d.series
				};
				groupedChannels['Value'] = { value: (/** @type {any} */ d) => formatValue(d.value) };

				if (isHz) {
					opts.marks.push(
						tip(
							longData,
							pointerY({
								fy: 'x',
								y: 'series',
								x: 'value',
								channels: groupedChannels,
								format: { x: false, y: false, ...TIP_HIDE_FACET },
								preferredAnchor: 'left',
								lineHeight: 1.3,
								fontSize: 11
							})
						)
					);
				} else {
					opts.marks.push(
						tip(
							longData,
							pointerX({
								fx: 'x',
								x: 'series',
								y: 'value',
								channels: groupedChannels,
								format: { x: false, y: false, ...TIP_HIDE_FACET },
								preferredAnchor: 'bottom',
								lineHeight: 1.3,
								fontSize: 11
							})
						)
					);
				}
			} else if (isHz) {
				// Position tooltip at the bar end
				const valueKey = seriesNames[0];
				opts.marks.push(
					tip(
						tooltipData,
						pointerY({
							y: 'category',
							x: valueKey,
							...tooltipFacet,
							channels: tipChannels,
							format: { x: false, y: false, ...TIP_HIDE_FACET },
							preferredAnchor: 'left',
							lineHeight: 1.3,
							fontSize: 11
						})
					)
				);
			} else {
				const valueKey = seriesNames[0];
				opts.marks.push(
					tip(
						tooltipData,
						pointerX({
							x: 'category',
							y: valueKey,
							...tooltipFacet,
							channels: tipChannels,
							format: { x: false, y: false, ...TIP_HIDE_FACET },
							preferredAnchor: 'bottom',
							lineHeight: 1.3,
							fontSize: 11
						})
					)
				);
			}
		}

		// Add annotation marks
		if (annotationResult.marks.length) {
			opts.marks.push(...annotationResult.marks);
		}

		return opts;
	});
</script>

{#if plotOptions}
	<div class="stratify-plot-outer {className}" bind:clientWidth={containerWidth}>
		<div class="stratify-plot-wrapper">
			{#if yLabel?.trim()}
				<span class="stratify-axis-label stratify-y-label">{yLabel}</span>
			{/if}
			<PlotChart options={plotOptions} height={effectiveHeight} class="flex-1 min-w-0" />
			{#if y2Label?.trim()}
				<span class="stratify-axis-label stratify-y2-label">{y2Label}</span>
			{/if}
		</div>
		{#if xLabel?.trim()}
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
