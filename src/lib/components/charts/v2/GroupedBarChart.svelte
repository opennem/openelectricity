<script>
	/**
	 * Grouped Bar Chart Component
	 *
	 * Chart renderer for grouped bar charts using scaleBand for the x-axis.
	 * Parallel to StackedAreaChart.svelte in the v2 chart system.
	 */
	import { LayerCake, Svg } from 'layercake';
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { AxisY } from './elements';
	import GroupedBar from './elements/GroupedBar.svelte';
	import AxisXRotated from './elements/AxisXRotated.svelte';

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

	/** Categories extracted from the data rows */
	let categories = $derived(chart.seriesScaledData.map((/** @type {any} */ d) => d.category));

	/**
	 * Handle series hover by updating chart store and forwarding event
	 * @param {{ data: any, key: string }} evt
	 */
	function handleSeriesHover(evt) {
		if (evt?.data?.category !== undefined) {
			chart.setHoverCategory(evt.data.category, evt.key);
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
		data={chart.seriesScaledData}
	>
		<!-- Main chart area with interactive bars -->
		<Svg>
			<GroupedBar
				dataset={chart.seriesScaledData}
				seriesNames={chart.visibleSeriesNames}
				seriesColours={chart.seriesColours}
				highlightId={chart.chartOptions.allowHoverHighlight ? chart.hoverKey : null}
				onmousemove={handleSeriesHover}
				onmouseout={handleSeriesOut}
			/>
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
