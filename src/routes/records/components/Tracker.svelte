<script>
	import { getContext, setContext } from 'svelte';
	import { colourReducer } from '$lib/stores/theme';
	import dataVizStore from '$lib/components/charts/stores/data-viz';
	import { getFormattedDate } from '$lib/utils/formatters';

	import process from '../page-data-options/tracker/process';
	import TrackerChart from './TrackerChart.svelte';
	import TrackerTable from './TrackerTable.svelte';

	setContext('tracker-data-viz', dataVizStore());

	let trackerDataVizStore = getContext('tracker-data-viz');
	let { focusData } = getContext('record-history-data-viz');
	let { seriesNames } = getContext('tracker-data-viz');

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

	/** @type {StatsData[]} */
	let dataset = $state.raw([]);
	let dataFilteredByType = $derived(
		dataset.length > 0 ? dataset.filter((d) => d.type === metric) : []
	);
	let processedData = $derived(
		dataFilteredByType.length > 0
			? process({
					history: dataFilteredByType,
					group: 'simple',
					unit: dataFilteredByType[0].units,
					colourReducer: $colourReducer,
					targetInterval: periodTargetIntervalMap[period]
				})
			: null
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

			console.log('ts.data', ts.data);

			trackerDataVizStore.yDomain.set([ts.minY, ts.maxY]);
			trackerDataVizStore.xTicks.set(undefined);
			trackerDataVizStore.formatTickX.set((/** @type {*} */ d) =>
				getFormattedDate(d, undefined, undefined, undefined, 'numeric')
			);

			trackerDataVizStore.baseUnit.set(stats.baseUnit);
			trackerDataVizStore.prefix.set(stats.prefix);
			trackerDataVizStore.allowedPrefixes.set(metricsPrefixMap[metric].allowedPrefixes);
			trackerDataVizStore.displayPrefix.set(metricsPrefixMap[metric].displayPrefix);
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
		trackerDataVizStore.focusTime.set(focusTime);
		if (focusId) {
			trackerDataVizStore.updateHiddenSeriesNames(focusId, true);
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
</script>

{#if notSupported}
	<div
		class="flex flex-col items-center justify-center h-full bg-white p-4 md:rounded-lg md:border border-warm-grey"
	>
		<p>Soon.</p>
	</div>
{:else}
	<div
		class="grid grid-cols-[5fr_2fr] md:gap-6 bg-white p-4 md:rounded-lg md:border border-warm-grey"
	>
		<div class="">
			<TrackerChart store={trackerDataVizStore} intervalString={periodTargetIntervalMap[period]} />
		</div>
		<div class="">
			<TrackerTable
				on:row-click={toggleRow}
				on:touchstart={handleTouchstart}
				on:touchend={handleTouchend}
			/>
		</div>
	</div>
{/if}
