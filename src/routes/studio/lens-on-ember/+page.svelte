<script>
	import { setContext, getContext, onMount } from 'svelte';
	import { addYears, startOfYear, eachYearOfInterval } from 'date-fns';
	import { goto } from '$app/navigation';
	import { colourReducer } from '$lib/stores/theme';
	import { formatFyTickX, getFormattedMonth, getFormattedDate } from '$lib/utils/formatters';

	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import DateBrush from '$lib/components/charts/DateBrush.svelte';
	import ResetZoom from '$lib/components/charts/elements/ResetZoom.html.svelte';

	import Meta from '$lib/components/Meta.svelte';
	import Filters from './components/Filters.svelte';
	import Chart from './components/Chart.svelte';
	import Table from './components/Table.svelte';
	import TableHeader from './components/TableHeader.svelte';

	import dataVizStore from '$lib/components/charts/stores/data-viz';
	import filtersStore from './stores/filters';

	import process from './page-data-options/process';
	import processDemand from './page-data-options/process-demand';

	/**
	 * @param {*[]} array
	 * @param {number} x
	 */
	function popEveryXItem(array, x = 3) {
		const result = [array[0]];

		// Loop through the array, skipping the first and last elements
		for (let i = 1; i < array.length - 1; i++) {
			if (i % x === 0) {
				result.push(array[i]);
			}
		}

		// Add the last element back
		result.push(array[array.length - 1]);

		return result;
	}

	// TODO: move this to utils
	function getMonthlyXTicks(ts) {
		const start = ts.data[0].date;
		const end = ts.data[ts.data.length - 1].date;

		const newEnd = startOfYear(addYears(end, 1));
		const years = eachYearOfInterval({ start, end: newEnd });

		return undefined;
	}

	function getYearlyXTicks(ts) {
		const start = ts.data[0].date;
		const end = ts.data[ts.data.length - 1].date;

		const years = popEveryXItem(eachYearOfInterval({ start, end: end }));

		return years;
	}

	export let data;

	const dataVizStoreNames = [
		{
			name: 'energy-data-viz',
			chart: 'energy'
		},
		{
			name: 'emissions-data-viz',
			chart: 'emissions'
		}
	];
	dataVizStoreNames.forEach(({ name }) => {
		setContext(name, dataVizStore());
	});
	setContext('filters', filtersStore());
	setContext('date-brush-data-viz', dataVizStore());

	const dataVizStores = dataVizStoreNames.reduce(
		/**
		 * @param {Object.<string, *>} acc
		 * @param {{name: string}} curr
		 */ (acc, curr) => {
			acc[curr.name] = getContext(curr.name);
			return acc;
		},
		{}
	);
	const {
		focusTime: energyFocusTime,
		displayPrefix: energyDisplayPrefix,
		hoverData: energyHoverData,
		focusData: energyFocusData
	} = dataVizStores['energy-data-viz'];
	const { displayPrefix: emissionsDisplayPrefix } = dataVizStores['emissions-data-viz'];
	const { selectedRegion, countries, selectedRange, selectedInterval, selectedFuelTechGroup } =
		getContext('filters');
	const dateBrushStore = getContext('date-brush-data-viz');

	let error = false;
	let errorMsg = '';
	let fetching = false;
	/** @type {StatsData[]} */
	let dataset;

	let touchDelay = 500;
	/** @type {*} */
	let touchTimer = null;

	$countries = data.countries;

	onMount(() => {
		$selectedRegion = data.region;
		$selectedRange = data.range;
		$selectedInterval = data.interval;
	});

	$: if (data.error) {
		console.error(data.error);
		error = true;
		errorMsg = data.error;
	}

	$: if ($selectedRegion && $selectedRange) {
		fetchData($selectedRegion, $selectedRange);
	}

	$: energyData = dataset ? dataset.filter((d) => d.type === 'energy') : [];
	$: energyDemandData = energyData ? energyData.filter((d) => d.fuel_tech === 'demand') : [];
	$: emissionsData = dataset ? dataset.filter((d) => d.type === 'emissions') : [];

	$: if (dataset && dataset.length > 0) {
		// Process data
		console.log('processing data');
		const processed = process({
			history: energyData,
			group: $selectedFuelTechGroup,
			unit: 'TWh',
			colourReducer: $colourReducer,
			calculate12MthRollingSum: $selectedRange === '12-month-rolling',
			targetInterval: $selectedRange === 'yearly' ? '1Y' : $selectedInterval
		});
		const processedEmissions = process({
			history: emissionsData,
			group: $selectedFuelTechGroup,
			unit: 'MtCO2e',
			calculate12MthRollingSum: $selectedRange === '12-month-rolling',
			colourReducer: $colourReducer,
			targetInterval: $selectedRange === 'yearly' ? '1Y' : $selectedInterval
		});
		const processedDemand = processDemand({
			history: energyDemandData,
			unit: 'TWh',
			colourReducer: $colourReducer,
			calculate12MthRollingSum: $selectedRange === '12-month-rolling',
			targetInterval: $selectedRange === 'yearly' ? '1Y' : $selectedInterval
		});

		console.log('processedDemand', processedDemand);

		dateBrushStore.seriesData.set(processedDemand.timeseries.data);
		dateBrushStore.seriesNames.set(processedDemand.timeseries.seriesNames);
		dateBrushStore.seriesColours.set(processedDemand.timeseries.seriesColours);
		dateBrushStore.seriesLabels.set(processedDemand.timeseries.seriesLabels);
		dateBrushStore.yDomain.set([0, null]);

		dateBrushStore.chartType.set('line');

		if ($selectedRange === 'yearly') {
			dateBrushStore.xTicks.set(getYearlyXTicks(processedDemand.timeseries));

			dateBrushStore.formatTickX.set((/** @type {*} */ d) =>
				getFormattedDate(d, undefined, undefined, undefined, 'numeric')
			);
		} else if ($selectedRange === '12-month-rolling') {
			dateBrushStore.xTicks.set(6);

			dateBrushStore.formatTickX.set((/** @type {*} */ d) =>
				getFormattedDate(d, undefined, undefined, 'short', 'numeric')
			);
		} else {
			dateBrushStore.xTicks.set(getMonthlyXTicks(processedDemand.timeseries));

			dateBrushStore.formatTickX.set((/** @type {*} */ d) =>
				getFormattedDate(d, undefined, undefined, 'short', '2-digit')
			);
		}

		dateBrushStore.strokeWidth.set(1);
		dateBrushStore.strokeArray.set(1);

		dataVizStoreNames.forEach(({ name }) => {
			const store = dataVizStores[name];
			switch (name) {
				case 'energy-data-viz':
					updateDataVizStore(
						'Energy',
						store,
						processed.stats,
						processed.timeseries,
						$energyDisplayPrefix || 'T',
						['M', 'G', 'T'],
						'h-[400px] md:h-[450px]'
					);
					break;

				case 'emissions-data-viz':
					updateDataVizStore(
						'Emissions',
						store,
						processedEmissions.stats,
						processedEmissions.timeseries,
						$emissionsDisplayPrefix || 'M',
						['k', 'M', 'G'],
						'h-[300px] md:h-[350px]'
					);
					break;
			}
		});
	}

	/**
	 * @param {string} region
	 * @param {string} range
	 */
	async function fetchData(region, range) {
		if (region) {
			let gotoPath = `?region=${region}&range=${range}`;
			if (range !== 'yearly') {
				gotoPath += `&interval=${$selectedInterval}`;
			}
			goto(gotoPath, { noScroll: true });

			fetching = true;
			const apiRange = range === '12-month-rolling' ? 'monthly' : range;
			const res = await fetch(`/api/ember-bridge/?region=${region}&range=${apiRange}`);
			const json = await res.json();
			console.log(json);
			dataset = json.data;
			fetching = false;
		}
	}

	/**
	 * @param {string} title
	 * @param {*} store
	 * @param {StatsInstance} stats
	 * @param {TimeSeriesInstance} ts
	 * @param {string} displayPrefix
	 * @param {string[]} allowedPrefixes
	 * @param {string} [chartHeightClasses]
	 */
	function updateDataVizStore(
		title,
		store,
		stats,
		ts,
		displayPrefix,
		allowedPrefixes,
		chartHeightClasses
	) {
		store.title.set(title);
		store.seriesData.set(ts.data);
		store.seriesNames.set(ts.seriesNames);
		store.seriesColours.set(ts.seriesColours);
		store.seriesLabels.set(ts.seriesLabels);
		store.nameOptions.set(
			[...ts.seriesNames].reverse().map((name) => {
				return { label: name, value: name };
			})
		);
		store.yDomain.set([ts.minY, ts.maxY]);
		store.chartHeightClasses.set(chartHeightClasses);

		if ($selectedRange === 'yearly') {
			store.xTicks.set(getYearlyXTicks(ts));
			store.formatTickX.set((/** @type {*} */ d) =>
				getFormattedDate(d, undefined, undefined, undefined, 'numeric')
			);
		} else if ($selectedRange === '12-month-rolling') {
			store.xTicks.set(6);
			store.formatTickX.set((/** @type {*} */ d) =>
				getFormattedDate(d, undefined, undefined, 'short', 'numeric')
			);
		} else {
			store.xTicks.set(getMonthlyXTicks(ts));
			store.formatTickX.set((/** @type {*} */ d) =>
				getFormattedDate(d, undefined, undefined, 'short', '2-digit')
			);
		}

		if (!store.$chartType) store.$chartType = 'area';
		if (!store.$curveType) store.$curveType = 'smooth';

		store.baseUnit.set(stats.baseUnit);
		store.prefix.set(stats.prefix);
		store.allowedPrefixes.set(allowedPrefixes);
		store.displayPrefix.set(displayPrefix);
	}

	/**
	 * @param {CustomEvent<{ name: string, isMetaPressed: boolean, allNames: string[] }>} evt
	 */
	function toggleRow(evt) {
		dataVizStoreNames.forEach(({ name, chart }) => {
			const store = dataVizStores[name];
			store.updateHiddenSeriesNames(`${evt.detail.name}.${chart}`, evt.detail.isMetaPressed);
		});
	}

	/**
	 * @param {string | undefined} hoverKey
	 * @param {TimeSeriesData | undefined} hoverData
	 */
	function updateStoreHover(hoverKey, hoverData) {
		dataVizStoreNames.forEach(({ name }) => {
			const store = dataVizStores[name];
			store.hoverTime.set(hoverData ? hoverData.time : undefined);
			store.hoverKey.set(hoverKey);
		});
	}

	/**
	 * @param {CustomEvent<{ data: TimeSeriesData, key: string }> | CustomEvent<TimeSeriesData>} evt
	 */
	function handleMousemove(evt) {
		if (evt.detail?.key) {
			updateStoreHover(evt.detail.key, evt.detail.data);
		} else {
			updateStoreHover(undefined, evt.detail);
		}
	}
	function handleMouseout() {
		updateStoreHover(undefined, undefined);
	}

	/**
	 * @param {CustomEvent<TimeSeriesData>} evt
	 */
	function handlePointerup(evt) {
		const focusTime = evt.detail?.time;
		const isSame = focusTime ? $energyFocusTime === focusTime : false;
		const time = isSame ? undefined : focusTime;

		dataVizStoreNames.forEach(({ name }) => {
			const store = dataVizStores[name];
			store.focusTime.set(time);
		});
	}

	/**
	 * @param {CustomEvent<{ name: string }>} evt
	 */
	function handleTouchstart(evt) {
		touchTimer = setTimeout(() => {
			dataVizStoreNames.forEach(({ name, chart }) => {
				const store = dataVizStores[name];
				store.updateHiddenSeriesNames(`${evt.detail.name}.${chart}`, true);
			});
		}, touchDelay);
	}

	function handleTouchend() {
		clearTimeout(touchTimer);
	}

	/** @type {*} */
	let brushedRange;
	/**
	 * @param {CustomEvent} evt
	 */
	function handleBrushed(evt) {
		if (evt.detail.start === evt.detail.end) {
			dataVizStoreNames.forEach(({ name }) => {
				const store = dataVizStores[name];
				store.xDomain.set([null, null]);
			});
			brushedRange = undefined;
			return;
		}
		dataVizStoreNames.forEach(({ name }) => {
			const store = dataVizStores[name];
			store.xDomain.set([evt.detail.start, evt.detail.end]);
		});
		brushedRange = [evt.detail.start, evt.detail.end];
	}

	function handleZoomReset() {
		dataVizStoreNames.forEach(({ name }) => {
			const store = dataVizStores[name];
			store.xDomain.set([null, null]);
		});
		brushedRange = undefined;
	}
</script>

<Meta
	title="The Studio — Lens on Ember"
	description="Lens visualises energy and emissions data from regions around the world using Open Electricity's visualisation components."
	image="/img/preview.jpg"
/>

<PageHeaderSimple>
	<div slot="main-heading">
		<h1 class="tracking-widest text-center">Lens on Ember</h1>
	</div>
	<div slot="sub-heading">
		<p class="text-sm text-center w-full md:w-[800px] mx-auto">
			Charts from Open Electricity. Data from
			<a href="https://ember-energy.org/" target="_blank">Ember</a>.
		</p>
	</div>
</PageHeaderSimple>

{#if error}
	<div class="md:container py-12 text-center">
		<p class="text-dark-red font-semibold">{errorMsg}</p>
	</div>
{:else}
	<section class="md:container py-12 flex justify-center" id="filters">
		{#if $countries && $countries.length}
			<Filters countries={$countries} />
		{/if}
	</section>
{/if}

<div class="w-full sticky top-0 bg-white z-30 md:px-16 md:py-10">
	<TableHeader
		store={dataVizStores['energy-data-viz']}
		date={$energyHoverData?.date || $energyFocusData?.date}
		yearOnly={$selectedRange === 'yearly'}
	/>
	<DateBrush
		store={dateBrushStore}
		hoverDataX={$energyHoverData}
		focusDataX={$energyFocusData}
		axisXTicks={undefined}
		dataXDomain={brushedRange}
		defaultChartHeightClasses="h-[25px]"
		showLineData={false}
		on:brushed={handleBrushed}
	/>
</div>

<div class="max-w-none py-10 md:p-16 md:pt-10 md:flex gap-12 z-30 border-b border-warm-grey mb-24">
	<section class="w-full flex flex-col gap-12 md:w-[60%]">
		{#if fetching}
			<div class="flex justify-center items-center mt-72">
				<div role="status">
					<svg
						aria-hidden="true"
						class="size-16 text-mid-warm-grey animate-spin dark:text-mid-grey fill-dark-grey"
						viewBox="0 0 100 101"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
							fill="currentColor"
						/>
						<path
							d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
							fill="currentFill"
						/>
					</svg>
					<span class="sr-only">Loading...</span>
				</div>
			</div>
		{:else}
			{#each dataVizStoreNames as { name }}
				<div class="relative">
					{#if brushedRange}
						<div class="absolute top-24 right-6 z-10">
							<ResetZoom on:click={handleZoomReset} />
						</div>
					{/if}
					<Chart
						store={dataVizStores[name]}
						on:mousemove={handleMousemove}
						on:mouseout={handleMouseout}
						on:pointerup={handlePointerup}
					/>
				</div>
			{/each}
		{/if}
	</section>

	<section class="md:w-[40%]" class:blur-sm={fetching}>
		<Table on:row-click={toggleRow} on:touchstart={handleTouchstart} on:touchend={handleTouchend} />
	</section>
</div>
