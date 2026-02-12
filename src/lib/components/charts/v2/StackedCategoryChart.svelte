<script>
	/**
	 * Stacked Category Chart Component
	 *
	 * A variation of the stacked chart using a category (band) axis instead of time.
	 * Each category (e.g., financial year) is a discrete column with hover highlighting.
	 * Uses stacked areas with step curves for visual continuity.
	 */
	import { LayerCake, Svg, flatten } from 'layercake';
	import { stack as lcStack, groupLonger } from 'layercake';
	import { stack as d3Stack, stackOffsetDiverging, line } from 'd3-shape';
	import { scaleOrdinal, scaleBand } from 'd3-scale';

	// v2 Element components
	import {
		StackedArea,
		AxisY,
		ClipPath,
		LineY,
		CategoryAxisX,
		CategoryLine,
		CategoryOverlay,
		PanZoomLayer
	} from './elements';
	import CategoryHoverLayer from './elements/CategoryHoverLayer.svelte';
	import HatchPattern from '$lib/components/charts/elements/defs/HatchPattern.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('./ChartStore.svelte.js').default} chart - The chart store instance
	 * @property {string} [netTotalKey] - Key for net total values in data
	 * @property {string} [netTotalColor] - Color for the net total line
	 * @property {*} [overlayStart] - Start category for hatched overlay (e.g., projection start)
	 * @property {(evt: { data: any, key?: string }) => void} [onmousemove]
	 * @property {() => void} [onmouseout]
	 * @property {(evt: any) => void} [onpointerup]
	 * @property {(() => void)} [onpanstart] - Called when pan starts
	 * @property {((deltaMs: number) => void)} [onpan] - Called during pan with time delta
	 * @property {(() => void)} [onpanend] - Called when pan ends
	 * @property {((factor: number, centerMs: number) => void)} [onzoom] - Called during zoom
	 * @property {boolean} [enablePan] - Whether panning is enabled
	 * @property {[number, number] | null} [viewDomain] - Time domain for pan/zoom calculations
	 */

	/** @type {Props} */
	let {
		chart,
		netTotalKey,
		netTotalColor = '#C74523',
		overlayStart,
		onmousemove,
		onmouseout,
		onpointerup,
		onpanstart,
		onpan,
		onpanend,
		onzoom,
		enablePan = false,
		viewDomain = null
	} = $props();

	// Overlay configuration
	let showOverlay = $derived(overlayStart !== undefined && overlayStart !== null);

	// Get chart styles
	let styles = $derived(chart.chartStyles);
	let id = $derived(styles.htmlId);

	// Extract categories from data using xKey
	let categories = $derived(chart.seriesScaledData.map((d) => d[chart.xKey]));

	// Create the band scale
	let bandScale = $derived(
		scaleBand().domain(categories).range([0, 100]).paddingInner(0).paddingOuter(0)
	);

	// Map data to use band positions for x values (start of each band for stepAfter)
	// Also add an extension point at the end to complete the last step
	let mappedData = $derived.by(() => {
		const data = chart.seriesScaledData.map((d) => {
			const category = d[chart.xKey];
			const bandPosition = bandScale(category);
			// Use the start of the band for stepAfter curve
			return {
				...d,
				_bandX: bandPosition ?? 0
			};
		});

		// Add extension point at the end to complete the last step
		if (data.length > 0) {
			const lastPoint = data[data.length - 1];
			const bandwidth = bandScale.bandwidth();
			data.push({
				...lastPoint,
				_bandX: (lastPoint._bandX ?? 0) + bandwidth
			});
		}

		return data;
	});

	// Process data based on chart type
	let stackedData = $derived.by(() => {
		if (mappedData.length === 0) return [];

		if (chart.useDivergingStack) {
			// Use d3 stack with diverging offset for independent positive/negative stacking
			const stackGen = d3Stack().keys(chart.visibleSeriesNames).offset(stackOffsetDiverging);
			return stackGen(mappedData);
		}

		return lcStack(mappedData, chart.visibleSeriesNames);
	});

	let groupedData = $derived(
		mappedData.length > 0 ? groupLonger(mappedData, chart.visibleSeriesNames) : []
	);

	let chartData = $derived(chart.chartOptions.isChartTypeArea ? stackedData : groupedData);

	let flatData = $derived(
		chart.chartOptions.isChartTypeArea
			? flatten(stackedData)
			: groupedData.length > 0
				? flatten(groupedData, 'values')
				: []
	);

	// Custom x accessor for band-mapped data
	let xAccessor = $derived((/** @type {any} */ d) => d._bandX ?? d.data?._bandX ?? 0);

	// Clip path IDs
	let clipPathId = $derived(`${id}-clip-path`);
	let clipPathAxisId = $derived(`${id}-clip-path-axis`);
	let clipPath = $derived(`url(#${clipPathId})`);
	let clipPathAxis = $derived(`url(#${clipPathAxisId})`);

	// Net total line data (if netTotalKey is provided)
	let showNetTotalLine = $derived(!!netTotalKey);
	let netTotalData = $derived(
		netTotalKey ? mappedData.map((d) => ({ ...d, _netTotal: d[netTotalKey] ?? 0 })) : []
	);

	// Chart width for coordinate conversion (set by LayerCake's width store via the SVG)
	// We'll use bind:clientWidth on the container for simplicity
	/** @type {number} */
	let chartWidth = $state(0);
	// Note: chartWidth is approximate (container width). The PanZoomLayer uses LayerCake's
	// $width internally for pan math. We only need chartWidth for category lookup from raw events.

	/**
	 * Find category at a pixel x position (for PanZoomLayer event forwarding)
	 * @param {number} offsetX
	 * @returns {string | number | undefined}
	 */
	function findCategoryAtX(offsetX) {
		if (!bandScale?.bandwidth || !chartWidth) return undefined;
		const scaledX = (offsetX / chartWidth) * 100;
		for (const cat of categories) {
			const bandStart = bandScale(cat) ?? 0;
			const bandEnd = bandStart + bandScale.bandwidth();
			if (scaledX >= bandStart && scaledX <= bandEnd) return cat;
		}
		return undefined;
	}

	/**
	 * Handle forwarded mousemove from PanZoomLayer — do category lookup
	 * @param {MouseEvent} evt
	 */
	function handleForwardedMouseMove(evt) {
		const category = findCategoryAtX(evt.offsetX);
		if (category !== undefined) {
			const item = chart.seriesScaledData.find((d) => d[chart.xKey] === category);
			if (item) onmousemove?.({ data: item });
		}
	}

	/**
	 * Handle forwarded mouseout from PanZoomLayer
	 */
	function handleForwardedMouseOut() {
		onmouseout?.();
	}

	/**
	 * Handle forwarded pointerup from PanZoomLayer — do category lookup for click
	 * @param {PointerEvent} evt
	 */
	function handleForwardedPointerUp(evt) {
		const category = findCategoryAtX(evt.offsetX);
		if (category !== undefined) {
			const item = chart.seriesScaledData.find((d) => d[chart.xKey] === category);
			if (item) onpointerup?.(item);
		}
	}
</script>

<div class="w-full {styles.chartHeightPx ? '' : styles.chartHeightClasses}" style:height={styles.chartHeightPx ? `${styles.chartHeightPx}px` : undefined} style:touch-action={enablePan ? 'none' : undefined} bind:clientWidth={chartWidth}>
	<LayerCake
		padding={styles.chartPadding}
		x={xAccessor}
		y={chart.y}
		z={chart.z}
		yDomain={chart.yDomain}
		xDomain={[0, 100]}
		zDomain={chart.seriesNames}
		zScale={scaleOrdinal()}
		zRange={chart.visibleSeriesColours}
		data={chartData}
		{flatData}
		custom={{ bandScale, categories, xKey: chart.xKey }}
	>
		<!-- Main chart area -->
		<Svg>
			<defs>
				<ClipPath id={clipPathId} />
				<ClipPath customPaddingLeft={15} customPaddingRight={15} id={clipPathAxisId} />
				{#if showOverlay}
					<HatchPattern id="{id}-hatch-pattern" />
				{/if}
			</defs>

			<!-- Chart content -->
			<g clip-path={clipPath}>
				<StackedArea
					dataset={mappedData}
					display={chart.chartOptions.selectedChartType}
					curveType={chart.chartOptions.curveFunction}
					seriesColours={chart.seriesColours}
					highlightId={chart.hoverKey}
				/>

				{#if showNetTotalLine}
					<CategoryLine
						data={netTotalData}
						valueKey="_netTotal"
						stroke={netTotalColor}
						curveType={chart.chartOptions.curveFunction}
					/>
				{/if}

				{#if showOverlay}
					<CategoryOverlay xStartValue={overlayStart} fill="url(#{id}-hatch-pattern)" />
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

			<!-- Category hover layer — visual highlight/focus rects + interaction when no pan -->
			<CategoryHoverLayer
				dataset={chart.seriesScaledData}
				xKey={chart.xKey}
				seriesNames={chart.visibleSeriesNames}
				useDivergingStack={chart.useDivergingStack}
				highlightCategory={chart.hoverCategory}
				focusCategory={chart.focusCategory}
				onmousemove={enablePan ? undefined : onmousemove}
				onmouseout={enablePan ? undefined : onmouseout}
				onpointerup={enablePan ? undefined : onpointerup}
			/>

			<!-- Pan/zoom layer on top — handles drag + forwards mouse events for hover -->
			{#if enablePan}
				<PanZoomLayer
					dataset={chart.seriesScaledData}
					{onpanstart}
					{onpan}
					{onpanend}
					{onzoom}
					enabled={enablePan}
					extraHeight={30}
					{viewDomain}
					onmousemove={handleForwardedMouseMove}
					onmouseout={handleForwardedMouseOut}
					onpointerup={handleForwardedPointerUp}
				/>
			{/if}
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

				<CategoryAxisX
					formatTick={chart.formatTickX}
					gridlines={styles.xGridlines}
					tickMarks={true}
					stroke={styles.xAxisStroke}
					fill={styles.xAxisFill}
					textClass={styles.xTextClasses}
					yTick={styles.xAxisYTick}
				/>
			</g>
		</Svg>
	</LayerCake>
</div>

<style>
	:global(.stratum-chart svg *:focus) {
		outline: none;
	}
</style>
