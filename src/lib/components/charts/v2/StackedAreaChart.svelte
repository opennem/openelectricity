<script>
	/**
	 * Stacked Area Chart Component
	 *
	 * Main chart rendering component using LayerCake.
	 * Supports both stacked area and line chart modes.
	 */
	import { LayerCake, Svg, flatten } from 'layercake';
	import { stack as lcStack, groupLonger } from 'layercake';
	import { stack as d3Stack, stackOffsetDiverging } from 'd3-shape';
	import { scaleOrdinal, scaleTime } from 'd3-scale';
	// v2 Element components
	import {
		StackedArea,
		LoadingOverlay,
		AxisX,
		AxisY,
		ClipPath,
		LineX,
		LineY,
		Dot,
		Shading,
		StepHoverBand
	} from './elements';
	import NetTotalLine from './elements/NetTotalLine.svelte';
	import HatchOverlay from './elements/HatchOverlay.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart - The chart store instance
	 * @property {(evt: { data: TimeSeriesData, key?: string }) => void} [onmousemove] - Series-key hover from StackedArea paths
	 * @property {() => void} [onmouseout]
	 * @property {(evt: TimeSeriesData) => void} [onpointerup]
	 * @property {boolean} [enablePan] - Whether panning is enabled (controls touch-action CSS)
	 * @property {Array<{start: number, end: number}>} [loadingRanges] - Ranges currently being fetched
	 * @property {string} [netTotalKey] - Key for net total values in data (renders step line)
	 * @property {string} [netTotalColor] - Color for net total line
	 * @property {number | null} [overlayStart] - Start time (ms) for hatched projection overlay
	 */

	/** @type {Props} */
	let {
		chart,
		onmousemove,
		onmouseout,
		onpointerup,
		enablePan = false,
		loadingRanges = [],
		netTotalKey,
		netTotalColor = '#C74523',
		overlayStart
	} = $props();

	// Get chart styles
	let styles = $derived(chart.chartStyles);
	let id = $derived(styles.htmlId);

	// Process data based on chart type
	let stackedData = $derived.by(() => {
		if (chart.seriesScaledData.length === 0) return [];

		if (chart.useDivergingStack) {
			// Use d3 stack with diverging offset for independent positive/negative stacking
			const stackGen = d3Stack().keys(chart.visibleSeriesNames).offset(stackOffsetDiverging);
			return stackGen(chart.seriesScaledData);
		}

		return lcStack(chart.seriesScaledData, chart.visibleSeriesNames);
	});

	let groupedData = $derived(
		chart.seriesScaledData.length > 0
			? groupLonger(chart.seriesScaledData, chart.visibleSeriesNames)
			: []
	);

	let chartData = $derived(chart.chartOptions.isChartTypeArea ? stackedData : groupedData);

	let flatData = $derived(
		chart.chartOptions.isChartTypeArea
			? flatten(stackedData)
			: groupedData.length > 0
				? flatten(groupedData, 'values')
				: []
	);

	// Determine if curve type is step (for band hover + axis alignment)
	let isStepMode = $derived(chart.chartOptions.selectedCurveType === 'step');

	// Clip path IDs
	let clipPathId = $derived(`${id}-clip-path`);
	let clipPathAxisId = $derived(`${id}-clip-path-axis`);
	let clipPath = $derived(`url(#${clipPathId})`);
	let clipPathAxis = $derived(`url(#${clipPathAxisId})`);
</script>

<div class="w-full {styles.chartHeightPx ? '' : styles.chartHeightClasses}" style:height={styles.chartHeightPx ? `${styles.chartHeightPx}px` : undefined} style:touch-action={enablePan ? 'none' : undefined}>
	<LayerCake
		padding={styles.chartPadding}
		x={chart.x}
		y={chart.y}
		z={chart.z}
		yDomain={chart.yDomain}
		xDomain={chart.xDomain}
		zDomain={chart.seriesNames}
		xScale={scaleTime()}
		zScale={scaleOrdinal()}
		zRange={chart.visibleSeriesColours}
		data={chartData}
		{flatData}
	>
		<!-- Main chart area -->
		<Svg>
			<defs>
				<ClipPath id={clipPathId} />
				<ClipPath customPaddingLeft={15} customPaddingRight={15} id={clipPathAxisId} />
			</defs>

			<!-- Shading overlay (behind chart content) -->
			{#if chart.shadingData?.length > 0}
				<Shading dataset={chart.shadingData} fill={chart.shadingFill} {clipPathId} />
			{/if}

			<!-- Chart content (on top to capture hover with series info) -->
			<g clip-path={clipPath}>
				<StackedArea
					dataset={chart.seriesScaledData}
					display={chart.chartOptions.selectedChartType}
					curveType={chart.chartOptions.curveFunction}
					seriesColours={chart.seriesColours}
					highlightId={chart.chartOptions.allowHoverHighlight ? chart.hoverKey : null}
					lighterNegative={chart.lighterNegative}
					stepMode={isStepMode}
					{onmousemove}
					{onmouseout}
					{onpointerup}
				/>

				{#if netTotalKey && isStepMode}
					<NetTotalLine
						dataset={chart.seriesScaledData}
						valueKey={netTotalKey}
						stroke={netTotalColor}
					/>
				{/if}

				{#if overlayStart != null}
					<HatchOverlay startTime={overlayStart} patternId="{id}-hatch-pattern" />
				{/if}
			</g>

			<!-- Reference lines (capacity annotations) -->
			{#each chart.yReferenceLines as refLine (refLine.value)}
				<LineY
					yValue={refLine.value}
					label={refLine.label}
					strokeColour={refLine.colour || '#666'}
				/>
			{/each}
		</Svg>

		<!-- Loading overlay -->
		{#if loadingRanges.length > 0}
			<Svg pointerEvents={false}>
				<LoadingOverlay {loadingRanges} />
			</Svg>
		{/if}

		<!-- Hover/Focus indicators -->
		<Svg pointerEvents={false}>
			<defs>
				<ClipPath id={clipPathId} />
				<ClipPath customPaddingLeft={15} customPaddingRight={15} id={clipPathAxisId} />
			</defs>

			<g clip-path={clipPathAxis}>
				{#if isStepMode}
					<!-- Step mode: band highlight like category charts -->
					<StepHoverBand
						dataset={chart.seriesScaledData}
						hoverTime={chart.hoverTime}
						focusTime={chart.focusTime}
					/>
				{:else}
					<!-- Continuous mode: vertical line + dots -->
					{#if chart.hoverData}
						<LineX
							xValue={chart.hoverData}
							yValue={styles.showHoverYLine ? chart.hoverData : undefined}
							strokeArray="none"
						/>
						{#if styles.showHoverDot}
							<Dot
								domains={chart.visibleSeriesNames}
								value={chart.hoverData}
								isStacked={true}
								colour="#333"
								r={4}
							/>
						{/if}
					{/if}

					{#if chart.focusData}
						<LineX
							xValue={chart.focusData}
							yValue={styles.showFocusYLine ? chart.focusData : undefined}
							strokeArray="none"
							strokeColour={styles.focusYLineStrokeColour}
						/>
						{#if styles.showFocusDot}
							<Dot
								domains={chart.visibleSeriesNames}
								value={chart.focusData}
								isStacked={true}
								colour={styles.focusYLineDotColour}
								r={styles.focusYLineDotRadius}
							/>
						{/if}
					{/if}
				{/if}
			</g>
		</Svg>

		<!-- Axes -->
		<Svg pointerEvents={false}>
			<g clip-path={clipPathAxis}>
				<AxisY
					ticks={chart.yTicks}
					formatTick={chart.useFormatY
						? chart.formatY
						: chart.chartOptions.isDataTransformTypeProportion
							? (/** @type {number} */ d) => d
							: chart.convertAndFormatValue}
					gridlines={true}
					stroke={styles.yAxisStroke}
					zeroValueStroke={styles.zeroValueStroke || styles.yAxisStroke}
					showLastTick={styles.showLastYTick}
				/>

				<AxisX
					ticks={chart.xTicks}
					gridlineTicks={chart.xGridlineTicks}
					formatTick={chart.formatTickXWithTimeZone}
					gridlines={styles.xGridlines}
					tickMarks={true}
					snapTicks={false}
					stroke={styles.xAxisStroke}
					fill={styles.xAxisFill}
					xTextClasses={styles.xTextClasses}
					yTick={styles.xAxisYTick}
					stepMode={isStepMode}
				/>
			</g>
		</Svg>
	</LayerCake>
</div>
