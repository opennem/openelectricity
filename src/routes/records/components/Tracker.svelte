<script>
	import { getContext, setContext } from 'svelte';
	import { startOfYear } from 'date-fns';

	import { colourReducer } from '$lib/stores/theme';
	import dataVizStore from '$lib/components/charts/stores/data-viz';
	import { getFormattedDate } from '$lib/utils/formatters';
	import DateBrush from '$lib/components/charts/DateBrush.svelte';
	import ResetZoom from '$lib/components/charts/elements/ResetZoom.html.svelte';

	import process from '../page-data-options/tracker/process';
	import TrackerChart from './TrackerChart.svelte';
	import TrackerTable from './TrackerTable.svelte';

	setContext('tracker-data-viz', dataVizStore());
	setContext('tracker-date-brush', dataVizStore());

	let trackerDataVizStore = getContext('tracker-data-viz');
	let trackerDateBrushStore = getContext('tracker-date-brush');
	let { focusData } = getContext('record-history-data-viz');
	let {
		seriesNames,
		seriesData,
		xDomain,
		focusData: trackerFocusData,
		hoverData: trackerHoverData
	} = getContext('tracker-data-viz');
	let { xTicks: trackerBrushXTicks, yTicks: trackerBrushYTicks } = getContext('tracker-date-brush');

	$trackerBrushXTicks = 4;
	$trackerBrushYTicks = 3;

	let notSupported = $state(false);

	let metricsPrefixMap = Object.freeze({
		power: {
			allowedPrefixes: ['M', 'G'],
			displayPrefix: 'M'
		},
		energy: {
			allowedPrefixes: ['M', 'G', 'T'],
			displayPrefix: 'M'
		},
		emissions: {
			allowedPrefixes: ['', 'k', 'M'],
			displayPrefix: ''
		}
	});
	let periodTargetIntervalMap = Object.freeze({
		interval: '5m',
		day: '1d',
		'7d': '7d',
		month: '1M',
		quarter: '1Q',
		year: '1Y'
	});

	let focusDate = $derived($focusData?.date);
	let focusTime = $derived($focusData?.time);
	/** @type {'power' | 'energy' | 'emissions'} */
	let metric = $derived($focusData?.metric);
	let network_id = $derived($focusData?.network_id);
	let network_region = $derived($focusData?.network_region);
	/** @type {'interval' | 'day' | '7d' | 'month' | 'quarter' | 'year'} */
	let period = $derived($focusData?.period);
	let interval = $derived($focusData?.interval);

	let isPeriodInterval = $derived(period === 'interval');
	let isPeriodDay = $derived(period === 'day');
	let isPeriodMonth = $derived(period === 'month');
	let isPeriodAvailable = $derived(
		period === 'day' || period === 'month' || period === 'quarter' || period === 'year'
	);
	let isStepCurve = $derived(
		period === 'day' || period === 'month' || period === 'quarter' || period === 'year'
	);
	let fuelTechGroup = $state('simple');

	/** @type {StatsData[]} */
	let dataset = $state.raw([]);
	let dataFilteredByType = $derived(
		dataset.length > 0 ? dataset.filter((d) => d.type === metric) : []
	);
	let processedData = $derived(
		dataFilteredByType.length > 0
			? process({
					history: dataFilteredByType,
					group: fuelTechGroup,
					unit: dataFilteredByType[0].units,
					colourReducer: $colourReducer,
					targetInterval: periodTargetIntervalMap[period]
				})
			: null
	);
	/** @type {*} */
	let brushedRange = $state();
	let xRange = $derived(
		$seriesData.length > 1
			? [$seriesData[0].date, $seriesData[$seriesData.length - 1].date]
			: undefined
	);

	$inspect('processedData', processedData);

	$effect(() => {
		if (processedData) {
			let ts = processedData.timeseries;
			let stats = processedData.stats;
			trackerDataVizStore.title.set(`${metric} - ${period}`);
			trackerDataVizStore.seriesData.set(ts.data);
			trackerDataVizStore.seriesNames.set(ts.seriesNames);
			trackerDataVizStore.seriesColours.set(ts.seriesColours);
			trackerDataVizStore.seriesLabels.set(ts.seriesLabels);
			trackerDataVizStore.chartHeightClasses.set('h-[505px]');
			trackerDataVizStore.curveType.set(isStepCurve ? 'step' : 'smooth');

			trackerDataVizStore.yDomain.set([ts.minY, ts.maxY]);
			trackerDataVizStore.xTicks.set(undefined);
			trackerDataVizStore.formatTickX.set((/** @type {*} */ d) =>
				getFormattedDate(d, undefined, undefined, undefined, 'numeric')
			);

			trackerDataVizStore.baseUnit.set(stats.baseUnit);
			trackerDataVizStore.prefix.set(stats.prefix);
			trackerDataVizStore.allowedPrefixes.set(metricsPrefixMap[metric].allowedPrefixes);
			trackerDataVizStore.displayPrefix.set(metricsPrefixMap[metric].displayPrefix);

			trackerDateBrushStore.xTicks.set(undefined);
			trackerDateBrushStore.seriesData.set(ts.data);
			trackerDateBrushStore.seriesNames.set(ts.seriesNames);
			trackerDateBrushStore.formatTickX.set((/** @type {*} */ d) =>
				getFormattedDate(d, undefined, undefined, undefined, 'numeric')
			);
		}
	});

	$effect(() => {
		if (focusDate && isPeriodAvailable) {
			notSupported = false;
			// get first 4 characters of interval
			let year = interval.slice(0, 4);
			let yearParam = isPeriodDay ? `&year=${year}` : '';
			let regionParam = network_region ? `&region=${network_region}` : '';
			// API only supports type energy and power.
			//  - Fetch those first and the other metrics that are inside the dataset
			//  - TODO: also use Period to check which api type to call
			let typeParam =
				metric && (metric === 'power' || metric === 'energy') ? `&type=${metric}` : '';
			let dataPath = `network=${network_id}${typeParam}${regionParam}${yearParam}`;
			fetchData(dataPath);
		} else {
			notSupported = true;
		}
	});

	$effect(() => {
		// $inspect('focusDate', focusDate);
		// $inspect('focusData', $focusData);
		// $inspect('trackerDataVizStore.seriesNames', $seriesNames);
		const fueltechId = $focusData?.fueltech_id;
		// find series name that contains fueltechId
		const focusId = $seriesNames.find((/** @type {string} */ name) => name.includes(fueltechId));
		const isRenewablesOrFossils =
			$focusData?.fueltech_id === 'renewables' || $focusData?.fueltech_id === 'fossils';
		trackerDataVizStore.focusTime.set(focusTime);

		if (isRenewablesOrFossils) {
			fuelTechGroup = 'rvf';
		}
		if (focusId) {
			trackerDataVizStore.updateHiddenSeriesNames(focusId, true);
		}
	});

	$effect(() => {
		if (focusTime) {
			let findIndex = $seriesData.findIndex(
				(/** @type {TimeSeriesData} */ d) => d.time === focusTime
			);

			if (findIndex === -1) return;

			handleZoomReset();

			let startIndex = findIndex - 10;
			if (startIndex < 0) startIndex = 0;
			let endIndex = findIndex + 10;
			if (endIndex > $seriesData.length - 1) endIndex = $seriesData.length - 1;

			$xDomain = [$seriesData[startIndex].date, $seriesData[endIndex].date];
			brushedRange = [$seriesData[startIndex].date, $seriesData[endIndex].date];
		}
	});

	/**
	 * @param {string} dataPath
	 */
	async function fetchData(dataPath) {
		const res = await fetch(`/api/energy?${dataPath}`);
		const json = await res.json();
		dataset = json.data;
	}

	let touchDelay = 500;
	/** @type {*} */
	let touchTimer = null;

	/**
	 * @param {CustomEvent<{ name: string, isMetaPressed: boolean, allNames: string[] }>} evt
	 */
	function toggleRow(evt) {
		trackerDataVizStore.updateHiddenSeriesNames(evt.detail.name, evt.detail.isMetaPressed);
	}

	/**
	 * @param {CustomEvent<{ name: string }>} evt
	 */
	function handleTouchstart(evt) {
		touchTimer = setTimeout(() => {
			trackerDataVizStore.updateHiddenSeriesNames(evt.detail.name, true);
		}, touchDelay);
	}

	function handleTouchend() {
		clearTimeout(touchTimer);
	}

	/**
	 * @param {CustomEvent} evt
	 */
	function handleBrushed(evt) {
		if (evt.detail.start === evt.detail.end) {
			$xDomain = xRange;
			brushedRange = undefined;
			return;
		}
		$xDomain = [evt.detail.start, evt.detail.end];
		brushedRange = [evt.detail.start, evt.detail.end];
	}

	function handleZoomReset() {
		$xDomain = xRange;
		brushedRange = undefined;
	}
</script>

{#if notSupported}
	<div class="flex flex-col items-center justify-center h-full">
		<p>Choose a record.</p>
	</div>
{:else}
	<!-- <div class="w-full h-[50px] bg-light-warm-grey p-6 rounded-lg mb-[24px]"></div> -->
	<DateBrush
		store={trackerDateBrushStore}
		hoverDataX={$trackerHoverData}
		focusDataX={$trackerFocusData}
		dataXDomain={brushedRange}
		useDataset={$seriesData}
		on:brushed={handleBrushed}
	/>
	<div class="grid grid-cols-[6fr_3fr] grid-rows-[1fr] md:gap-6 mt-[25px]">
		<div class="relative">
			{#if brushedRange}
				<div class="absolute top-24 right-3 z-10">
					<ResetZoom on:click={handleZoomReset} />
				</div>
			{/if}
			<TrackerChart store={trackerDataVizStore} intervalString={periodTargetIntervalMap[period]} />
		</div>

		<TrackerTable
			on:row-click={toggleRow}
			on:touchstart={handleTouchstart}
			on:touchend={handleTouchend}
		/>
	</div>
{/if}
