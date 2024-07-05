<script>
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { startOfYear } from 'date-fns';

	import LogoMark from '$lib/images/logo-mark.svelte';
	import ExplorerTooltip from './Tooltip.svelte';
	import ExplorerChart from './Chart.svelte';
	import ExplorerTable from './Table.svelte';
	import ExplorerTechnologyTable from './TechnologyTable.svelte';
	import {
		processTechnologyData,
		processScenarioData,
		processRegionData,
		formatFyTickX
	} from './helpers';
	import {
		dataViewDescription,
		dataViewlabel,
		dataViewUnits,
		dataViewLongLabel,
		dataViewIntervalLabel
	} from './options';

	const {
		selectedDisplayView,
		selectedModel,
		selectedDataView,
		isTechnologyDisplay,
		isScenarioDisplay,
		isRegionDisplay
	} = getContext('scenario-filters');

	const {
		usePercentage,
		isNetTotalGroup,

		historicalTimeSeries,
		projectionStats,
		projectionTimeSeries,
		scenarioProjectionData,
		scenarioProjectionStats,
		scenarioProjectionTimeSeries,
		scenarioHistoricalTimeSeries,
		regionProjectionTimeSeries,
		regionHistoricalTimeSeries
	} = getContext('scenario-data');

	const { cachedDisplayData } = getContext('scenario-cache');

	let showTable = true;

	let seriesNames = [];
	let seriesItems = [];
	let seriesColours;
	let seriesLabels;
	let seriesData = [];
	let seriesLoadsIds = [];
	/** @type {Array.<number | null>} */
	let yDomain = [0, null];

	/** @type {TimeSeriesData | undefined} */
	let hoverData = undefined;

	/** @type {string | undefined} */
	let hoverKey;

	/** @type {string | null} */
	let highlightId = null;

	const handleMousemove = (/** @type {*} */ e) => {
		if (e.detail?.key) {
			hoverKey = e.detail.key;
			hoverData = /** @type {TimeSeriesData} */ (e.detail.data);
		} else {
			hoverKey = undefined;
			hoverData = /** @type {TimeSeriesData} */ (e.detail);
		}
	};

	$: xTicks =
		$selectedModel === 'aemo2024'
			? [
					startOfYear(new Date('2010-01-01')),
					startOfYear(new Date('2024-01-01')),
					startOfYear(new Date('2040-01-01')),
					startOfYear(new Date('2052-01-01'))
			  ]
			: [
					startOfYear(new Date('2010-01-01')),
					startOfYear(new Date('2023-01-01')),
					startOfYear(new Date('2040-01-01')),
					startOfYear(new Date('2051-01-01'))
			  ];

	$: display = $isTechnologyDisplay ? 'area' : 'line';
	$: showContribution = $isTechnologyDisplay;
	$: overlay = $isScenarioDisplay
		? {
				xStartValue: startOfYear(new Date('2024-01-01')),
				xEndValue: startOfYear(new Date('2052-01-01'))
		  }
		: $selectedModel === 'aemo2024'
		? {
				xStartValue: startOfYear(new Date('2024-01-01')),
				xEndValue: startOfYear(new Date('2052-01-01'))
		  }
		: {
				xStartValue: startOfYear(new Date('2023-01-01')),
				xEndValue: startOfYear(new Date('2051-01-01'))
		  };
	// $: blankOverlay =
	// 	$selectedModel === 'aemo2024'
	// 		? {
	// 				xStartValue: startOfYear(new Date('2023-01-01')),
	// 				xEndValue: startOfYear(new Date('2025-01-01'))
	// 		  }
	// 		: false;
	$: blankOverlay = false;
	$: overlayLine =
		$selectedModel === 'aemo2024' || $isScenarioDisplay
			? { date: startOfYear(new Date('2024-01-01')) }
			: { date: startOfYear(new Date('2023-01-01')) };

	$: overlayStroke = $isTechnologyDisplay ? 'rgba(236, 233, 230, 0.4)' : 'rgba(236, 233, 230, 1)';

	$: if ($isTechnologyDisplay) {
		console.log('Process technology data');

		const processed = processTechnologyData({
			projectionTimeSeries: $projectionTimeSeries,
			historicalTimeSeries: $historicalTimeSeries,
			selectedDataView: $selectedDataView,
			selectedModel: $selectedModel
		});

		if (processed) {
			seriesData = processed.data;
			seriesNames = processed.names;
			seriesColours = processed.colours;
			seriesLabels = processed.labels;
			seriesItems = processed.nameOptions;
			yDomain = [$projectionTimeSeries.minY, $projectionTimeSeries.maxY];

			seriesLoadsIds = $projectionStats.data.filter((d) => d.isLoad).map((d) => d.id);

			$cachedDisplayData[$selectedDisplayView] = {
				data: seriesData,
				names: seriesNames,
				colours: seriesColours,
				labels: seriesLabels,
				items: seriesItems,
				loadIds: seriesLoadsIds,
				yDomain: yDomain
			};
		}
	} else if ($selectedDisplayView === 'scenario') {
		console.log('Process scenario data');

		const historySeriesName = $isNetTotalGroup
			? '_max'
			: $scenarioHistoricalTimeSeries.seriesNames[0];

		const processed = processScenarioData({
			scenarioProjectionData: $scenarioProjectionData,
			scenarioProjectionTimeSeries: $scenarioProjectionTimeSeries,
			scenarioHistoricalTimeSeries: $scenarioHistoricalTimeSeries,
			selectedDataView: $selectedDataView,
			historySeriesName: historySeriesName
		});

		if (processed) {
			seriesData = processed.data;
			seriesNames = processed.names;
			seriesColours = processed.colours;
			seriesLabels = processed.labels;
			seriesItems = processed.nameOptions;
			yDomain = [0, null];

			$cachedDisplayData[$selectedDisplayView] = {
				data: seriesData,
				names: seriesNames,
				colours: seriesColours,
				labels: seriesLabels,
				items: seriesItems,
				yDomain: yDomain
			};
		}
	} else if ($selectedDisplayView === 'region') {
		console.log('Process region data');

		const historySeriesName = $isNetTotalGroup
			? '_max'
			: $scenarioHistoricalTimeSeries.seriesNames[0];

		const processed = processRegionData({
			regionProjectionTimeSeries: $regionProjectionTimeSeries,
			regionHistoricalTimeSeries: $regionHistoricalTimeSeries,
			selectedDataView: $selectedDataView,
			historySeriesName: historySeriesName,
			selectedModel: $selectedModel
		});

		if (processed) {
			seriesData = processed.data;
			seriesNames = processed.names;
			seriesColours = processed.colours;
			seriesLabels = processed.labels;
			seriesItems = processed.nameOptions;
			yDomain = [0, null];

			$cachedDisplayData[$selectedDisplayView] = {
				data: seriesData,
				names: seriesNames,
				colours: seriesColours,
				labels: seriesLabels,
				items: seriesItems,
				yDomain: yDomain
			};
		}
	}

	// TODO: reorder
	$: sortedItems = seriesItems.map((d) => d.id).reverse();
	$: if ($cachedDisplayData[$selectedDisplayView]) {
		let colours = {};
		console.log('seriesColours', seriesColours);
		sortedItems.forEach((name) => {
			colours[name] = $cachedDisplayData[$selectedDisplayView].colours[name];
		});
		seriesColours = colours;
	}

	$: isPercentageView = !$isNetTotalGroup && $usePercentage;
	$: defaultText =
		dataViewLongLabel[$selectedDataView] +
		` (${isPercentageView ? '% of demand' : dataViewUnits[$selectedDataView]}) ` +
		dataViewIntervalLabel[$selectedDataView];

	function handleSort(e) {
		seriesItems = e.detail;
	}
</script>

{#if seriesData.length > 0}
	<div class="grid grid-cols-12 gap-4">
		<div class="col-span-8 pt-4">
			{#if $selectedDataView === 'capacity'}
				<h4 class="opacity-30 font-space uppercase font-normal text-xs absolute top-0 mt-6 z-50">
					Historical Capacity Unavailable
				</h4>
			{/if}

			<div class="relative">
				<ExplorerTooltip
					{hoverData}
					{hoverKey}
					{defaultText}
					{seriesColours}
					{seriesLabels}
					showTotal={$isTechnologyDisplay}
				/>
			</div>

			<ExplorerChart
				id="scenarios-explorer-chart"
				dataset={seriesData}
				xKey="date"
				yKey={[0, 1]}
				zKey="key"
				{xTicks}
				{yDomain}
				seriesNames={sortedItems}
				{seriesColours}
				formatTickX={formatFyTickX}
				{display}
				{overlay}
				{blankOverlay}
				{overlayLine}
				{hoverData}
				{highlightId}
				{overlayStroke}
				on:mousemove={handleMousemove}
				on:mouseout={() => {
					hoverKey = undefined;
					hoverData = undefined;
				}}
			/>
		</div>
		<div class="col-span-4">
			{#if showTable}
				{#if $isTechnologyDisplay}
					<ExplorerTechnologyTable
						valueColumnName={dataViewlabel[$selectedDataView]}
						units={dataViewUnits[$selectedDataView]}
						{seriesItems}
						{seriesLabels}
						{seriesColours}
						{seriesLoadsIds}
						{hoverData}
						{showContribution}
						on:sort={handleSort}
						on:highlight={(e) => (highlightId = e.detail.id)}
					/>
				{:else}
					<ExplorerTable
						valueColumnName={dataViewlabel[$selectedDataView]}
						units={!$usePercentage || $isNetTotalGroup ? dataViewUnits[$selectedDataView] : '%'}
						{seriesItems}
						{seriesLabels}
						{seriesColours}
						{hoverData}
						{showContribution}
						on:sort={handleSort}
						on:highlight={(e) => (highlightId = e.detail.id)}
					/>
				{/if}
			{/if}
		</div>
	</div>
{:else}
	<div
		class="h-screen bg-light-warm-grey flex justify-center items-center"
		transition:fade={{ duration: 250 }}
	>
		<LogoMark />
	</div>
{/if}
