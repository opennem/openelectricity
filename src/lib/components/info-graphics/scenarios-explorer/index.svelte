<script>
	import { getContext } from 'svelte';
	import { fade } from 'svelte/transition';
	import { format, startOfYear } from 'date-fns';

	import LogoMark from '$lib/images/logo-mark.svelte';
	import Toggle from '$lib/components/form-elements/Toggle.svelte';
	import ExplorerTooltip from './Tooltip.svelte';
	import ExplorerChart from './Chart.svelte';
	import ExplorerTable from './Table.svelte';
	import { processTechnologyData, processRegionData, formatFyTickX } from './helpers';
	import { dataViewDescription, dataViewlabel } from './options';

	const {
		selectedDisplayView,
		selectedModel,
		selectedScenario,
		selectedPathway,
		selectedRegion,
		selectedDataView,
		selectedChartType,

		scenarioOptions,
		pathwayOptions
	} = getContext('scenario-filters');

	const {
		historicalStats,
		historicalTimeSeries,
		projectionStats,
		projectionTimeSeries,
		regionProjectionStats,
		regionProjectionTimeSeries,
		regionHistoricalStats,
		regionHistoricalTimeSeries
	} = getContext('scenario-data');

	let showTable = true;

	let seriesNames = [];
	let seriesItems = [];
	let seriesColours;
	let seriesLabels;
	let seriesData = [];
	/** @type {Array.<number | null>} */
	let yDomain = [0, null];

	/** @type {TimeSeriesData | undefined} */
	let hoverData = undefined;

	/** @type {string | undefined} */
	let hoverKey;

	/** @type {*} */
	let cachedDisplayData = {};

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
					startOfYear(new Date('2024-01-01')),
					startOfYear(new Date('2040-01-01')),
					startOfYear(new Date('2051-01-01'))
			  ];
	$: display = $selectedDisplayView === 'technology' ? 'area' : 'line';
	$: showContribution = $selectedDisplayView === 'technology';
	$: overlay =
		$selectedModel === 'aemo2024'
			? {
					xStartValue: startOfYear(new Date('2025-01-01')),
					xEndValue: startOfYear(new Date('2052-01-01'))
			  }
			: {
					xStartValue: startOfYear(new Date('2024-01-01')),
					xEndValue: startOfYear(new Date('2051-01-01'))
			  };
	$: blankOverlay =
		$selectedModel === 'aemo2024'
			? {
					xStartValue: startOfYear(new Date('2023-01-01')),
					xEndValue: startOfYear(new Date('2025-01-01'))
			  }
			: false;
	$: overlayLine =
		$selectedModel === 'aemo2024'
			? { date: startOfYear(new Date('2025-01-01')) }
			: { date: startOfYear(new Date('2024-01-01')) };

	$: if ($selectedDisplayView === 'technology') {
		console.log('data by technology');

		const processed = processTechnologyData({
			projectionTimeSeries: $projectionTimeSeries,
			historicalTimeSeries: $historicalTimeSeries,
			selectedDataView: $selectedDataView
		});

		if (processed) {
			seriesData = processed.data;
			seriesNames = processed.names;
			seriesColours = processed.colours;
			seriesLabels = processed.labels;
			seriesItems = processed.nameOptions;
			yDomain = [$projectionTimeSeries.minY, $projectionTimeSeries.maxY];

			cachedDisplayData[$selectedDisplayView] = {
				data: seriesData,
				names: seriesNames,
				colours: seriesColours,
				labels: seriesLabels,
				items: seriesItems,
				yDomain: yDomain
			};

			console.log('processed technology', processed);
		}
	} else if ($selectedDisplayView === 'region') {
		console.log('data by region');

		const processed = processRegionData({
			regionProjectionTimeSeries: $regionProjectionTimeSeries,
			regionHistoricalTimeSeries: $regionHistoricalTimeSeries,
			selectedDataView: $selectedDataView
		});

		if (processed) {
			seriesData = processed.data;
			seriesNames = processed.names;
			seriesColours = processed.colours;
			seriesLabels = processed.labels;
			seriesItems = processed.nameOptions;
			yDomain = [0, null];

			cachedDisplayData[$selectedDisplayView] = {
				data: seriesData,
				names: seriesNames,
				colours: seriesColours,
				labels: seriesLabels,
				items: seriesItems,
				yDomain: yDomain
			};

			// console.log('processed region', processed);
		}
	}

	// TODO: reorder
	$: sortedItems = seriesItems.map((d) => d.id).reverse();
	$: {
		let colours = {};
		sortedItems.forEach((name) => {
			colours[name] = cachedDisplayData[$selectedDisplayView].colours[name];
		});
		seriesColours = colours;
	}

	function handleSort(e) {
		seriesItems = e.detail;
	}
</script>

{#if seriesData.length > 0}
	<div class="grid grid-cols-12 gap-4">
		<div class="col-span-8">
			<!-- <Toggle checked={showTable} on:click={() => (showTable = !showTable)} /> -->

			<ExplorerTooltip
				{hoverData}
				{hoverKey}
				defaultText={dataViewDescription[$selectedDataView]}
				{seriesColours}
				{seriesLabels}
			/>
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
				on:mousemove={handleMousemove}
				on:mouseout={() => {
					hoverKey = undefined;
					hoverData = undefined;
				}}
			/>
		</div>
		<div class="col-span-4">
			{#if showTable}
				<ExplorerTable
					valueColumnName={dataViewlabel[$selectedDataView]}
					{seriesItems}
					{seriesLabels}
					{seriesColours}
					{hoverData}
					{showContribution}
					on:sort={handleSort}
				/>
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
