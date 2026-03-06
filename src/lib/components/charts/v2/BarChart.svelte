<script>
	/**
	 * Bar Chart Component
	 *
	 * Chart renderer for bar charts using scaleBand for the x-axis.
	 * Supports both stacked and grouped modes, and both category
	 * and time-series data sources.
	 *
	 * Parallel to StackedAreaChart.svelte in the v2 chart system.
	 */
	import { LayerCake, Svg } from 'layercake';
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { stack as d3Stack, stackOffsetDiverging } from 'd3-shape';
	import { AxisY, GroupedBar, StackedBar, AxisXRotated } from './elements';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart - The chart store instance
	 * @property {(evt: { data: any, key?: string }) => void} [onmousemove] - Series hover callback
	 * @property {() => void} [onmouseout] - Series hover end callback
	 * @property {(evt: any) => void} [onpointerup] - Click callback
	 */

	/** @type {Props} */
	let {
		chart,
		onmousemove,
		onmouseout,
		onpointerup
	} = $props();

	let styles = $derived(chart.chartStyles);
	let isStacked = $derived(chart.chartOptions.isChartTypeBarStacked);
	let isCategoryChart = $derived(chart.isCategoryChart);

	/** Formatter for time-series x-axis labels */
	const dateFormatter = new Intl.DateTimeFormat('en-AU', {
		month: 'short',
		year: 'numeric'
	});

	/**
	 * Augment time-series rows with `_xLabel` for scaleBand domain.
	 * Category data is passed through unchanged.
	 */
	let dataset = $derived.by(() => {
		const data = chart.seriesScaledData;
		if (isCategoryChart) return data;

		return data.map((/** @type {any} */ d) => ({
			...d,
			_xLabel: d.date ? dateFormatter.format(new Date(d.date)) : String(d.time)
		}));
	});

	/** Band domain labels for the x-axis */
	let categories = $derived(
		dataset.map((/** @type {any} */ d) => d.category ?? d._xLabel)
	);

	/** D3 stack data for stacked mode */
	let stackedData = $derived.by(() => {
		if (!isStacked || dataset.length === 0) return [];

		const stackGen = d3Stack().keys(chart.visibleSeriesNames);

		if (chart.useDivergingStack) {
			stackGen.offset(stackOffsetDiverging);
		}

		return stackGen(dataset);
	});

	/**
	 * Handle series hover by updating chart store and forwarding event.
	 * Uses setHover for time-series data and setHoverCategory for category data.
	 * @param {{ data: any, key: string }} evt
	 */
	function handleSeriesHover(evt) {
		if (isCategoryChart) {
			if (evt?.data?.category !== undefined) {
				chart.setHoverCategory(evt.data.category, evt.key);
			}
		} else {
			if (evt?.data?.time !== undefined) {
				chart.setHover(evt.data.time, evt.key);
			}
		}
		onmousemove?.(evt);
	}

	/** Handle series hover end by clearing chart store and forwarding event */
	function handleSeriesOut() {
		chart.clearHover();
		onmouseout?.();
	}
</script>

<div
	class="w-full {styles.chartHeightPx ? '' : styles.chartHeightClasses}"
	style:height={styles.chartHeightPx ? `${styles.chartHeightPx}px` : undefined}
>
	<LayerCake
		padding={{ top: 10, right: 15, bottom: 80, left: 50 }}
		xScale={scaleBand().paddingInner(0.2).paddingOuter(0.1)}
		yScale={scaleLinear()}
		xDomain={categories}
		yDomain={chart.yDomain}
		data={dataset}
	>
		<!-- Main chart area with interactive bars -->
		<Svg>
			{#if isStacked}
				<StackedBar
					{stackedData}
					seriesColours={chart.seriesColours}
					highlightId={chart.chartOptions.allowHoverHighlight ? chart.hoverKey : null}
					onmousemove={handleSeriesHover}
					onmouseout={handleSeriesOut}
				/>
			{:else}
				<GroupedBar
					dataset={dataset}
					seriesNames={chart.visibleSeriesNames}
					seriesColours={chart.seriesColours}
					highlightId={chart.chartOptions.allowHoverHighlight ? chart.hoverKey : null}
					onmousemove={handleSeriesHover}
					onmouseout={handleSeriesOut}
				/>
			{/if}
		</Svg>

		<!-- Axes (non-interactive layer) -->
		<Svg pointerEvents={false}>
			<AxisY
				ticks={chart.yTicks}
				formatTick={chart.convertAndFormatValue}
				gridlines={true}
				stroke={styles.yAxisStroke}
			/>

			<AxisXRotated {categories} />
		</Svg>
	</LayerCake>
</div>
