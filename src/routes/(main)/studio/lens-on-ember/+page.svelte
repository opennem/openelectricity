<script>
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { colourReducer } from '$lib/stores/theme';
	import Meta from '$lib/components/Meta.svelte';
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import LensChart from '$lib/components/charts/LensChart.svelte';
	import DateBrushWithContext from '$lib/components/charts/DateBrushWithContext.svelte';
	import init from './page-data-options/init.js';
	import fetchData from './page-data-options/fetch.js';
	import { fuelTechMap, orderMap, labelReducer } from './page-data-options/groups';
	import process from './page-data-options/process.js';
	import Filters from './components/Filters.svelte';
	import Table from './components/Table.svelte';
	import Loading from './components/Loading.svelte';

	let { data } = $props();
	// Initialize contexts once with initial server data (intentionally non-reactive)
	let { chartCxts, dateBrushCxt, filtersCxt } = untrack(() => init(data));

	let fetching = $state(false);
	let error = $state(false);
	/** @type {StatsData[]} */
	let dataset = $state([]);
	/** @type {Record<string, StatsData[]>} */
	let cachedDataset = $state({});

	dateBrushCxt.chartStyles.chartHeightClasses = 'h-[50px] mb-10';
	dateBrushCxt.chartStyles.strokeWidth = 1;

	$effect(() => {
		if (filtersCxt.selectedRegion && filtersCxt.selectedRange) {
			let key = filtersCxt.selectedRegion + filtersCxt.selectedRange;
			error = false;
			if (cachedDataset[key]) {
				dataset = cachedDataset[key];
			} else {
				fetching = true;
				fetchData(filtersCxt.selectedRegion, filtersCxt.selectedRange).then((data) => {
					if (data) {
						dataset = data;
						cachedDataset[key] = data;
					} else {
						console.error('Error fetching data', data);
						error = true;
					}
					fetching = false;
				});
			}
		}
	});

	let energyData = $derived(dataset ? dataset.filter((d) => d.type === 'energy') : []);
	let emissionsData = $derived(dataset ? dataset.filter((d) => d.type === 'emissions') : []);
	let demandData = $derived(energyData.filter((d) => d.fuel_tech === 'demand'));

	let processedEnergyData = $derived(
		energyData.length > 0
			? process({
					history: energyData,
					unit: chartCxts['energy-chart'].chartOptions.baseUnit,
					colourReducer: $colourReducer,
					calculate12MthRollingSum: filtersCxt.is12MthRollingSum,
					fuelTechMap: fuelTechMap[filtersCxt.selectedFuelTechGroup],
					fuelTechOrder: orderMap[filtersCxt.selectedFuelTechGroup],
					labelReducer: labelReducer[filtersCxt.selectedFuelTechGroup],
					targetInterval: filtersCxt.isYearly ? '1Y' : filtersCxt.selectedInterval
				})
			: null
	);
	let processedEmissionsData = $derived(
		emissionsData.length > 0
			? process({
					history: emissionsData,
					unit: chartCxts['emissions-chart'].chartOptions.baseUnit,
					colourReducer: $colourReducer,
					calculate12MthRollingSum: filtersCxt.is12MthRollingSum,
					fuelTechMap: fuelTechMap[filtersCxt.selectedFuelTechGroup],
					fuelTechOrder: orderMap[filtersCxt.selectedFuelTechGroup],
					labelReducer: labelReducer[filtersCxt.selectedFuelTechGroup],
					targetInterval: filtersCxt.isYearly ? '1Y' : filtersCxt.selectedInterval
				})
			: null
	);
	let processedDemandData = $derived(
		demandData.length > 0
			? process({
					history: demandData,
					unit: dateBrushCxt.chartOptions.baseUnit,
					colourReducer: () => 'red',
					calculate12MthRollingSum: filtersCxt.is12MthRollingSum,
					fuelTechMap: { demand: ['demand'] },
					fuelTechOrder: ['demand'],
					labelReducer: () => 'Demand',
					targetInterval: filtersCxt.isYearly ? '1Y' : filtersCxt.selectedInterval
				})
			: null
	);

	$effect(() => {
		if (processedEnergyData) {
			updateCxt('energy-chart', processedEnergyData.timeseries);
		}
	});

	$effect(() => {
		if (processedEmissionsData) {
			updateCxt('emissions-chart', processedEmissionsData.timeseries);
		}
	});

	$effect(() => {
		if (processedDemandData) {
			let cxt = dateBrushCxt;
			let ts = processedDemandData.timeseries;

			cxt.seriesData = ts.data;
			cxt.seriesNames = ts.seriesNames;
			cxt.seriesColours = ts.seriesColours;
			cxt.seriesLabels = ts.seriesLabels;

			cxt.yKey = ts.seriesNames[0];
			cxt.xTicks = filtersCxt.valueFormatters.ticks(ts.data);
			cxt.formatX = filtersCxt.valueFormatters.format;
			cxt.formatTickX = filtersCxt.valueFormatters.formatTick;
		}
	});

	/**
	 * @param {string} cxtName
	 * @param {TimeSeriesInstance} ts
	 */
	function updateCxt(cxtName, ts) {
		let cxt = chartCxts[cxtName];
		cxt.seriesData = ts.data;
		cxt.seriesNames = ts.seriesNames;
		cxt.seriesColours = ts.seriesColours;
		cxt.seriesLabels = ts.seriesLabels;

		cxt.xTicks = filtersCxt.valueFormatters.ticks(ts.data);
		cxt.formatX = filtersCxt.valueFormatters.format;
		cxt.formatTickX = filtersCxt.valueFormatters.formatTick;
	}

	/**
	 * @param {string | undefined} hoverKey
	 * @param {TimeSeriesData | undefined} hoverData
	 */
	function updateChartHover(hoverKey, hoverData) {
		let hoverTime = hoverData ? hoverData.time : undefined;
		dateBrushCxt.hoverTime = hoverTime;

		// loop through all charts and update the hover time and key
		Object.values(chartCxts).forEach((cxt) => {
			cxt.hoverTime = hoverTime;
			cxt.hoverKey = hoverKey;
		});
	}

	/**
	 * @param {number} time
	 */
	function updateChartFocus(time) {
		let isSame = dateBrushCxt.focusTime === time;
		dateBrushCxt.focusTime = isSame ? undefined : time;

		Object.values(chartCxts).forEach((cxt) => {
			cxt.focusTime = isSame ? undefined : time;
		});
	}

	/**
	 * @param {Date[] | undefined} xDomain
	 */
	function updateChartXDomain(xDomain) {
		Object.values(chartCxts).forEach((cxt) => {
			// if the start and end of the xDomain are the same, reset and clear the xDomain
			if (xDomain && xDomain[0].getTime() === xDomain[1].getTime()) {
				cxt.xDomain = undefined;
				cxt.xTicks = filtersCxt.valueFormatters.ticks(cxt.seriesData);
			} else {
				cxt.xDomain = xDomain;
				cxt.xTicks = xDomain ? 5 : filtersCxt.valueFormatters.ticks(cxt.seriesData);
			}
		});
	}

	/**
	 * @param {{ data: TimeSeriesData, key?: string } | TimeSeriesData} evt
	 */
	function onmousemove(evt) {
		if (!evt) return;
		let key = /** @type {string | undefined} */ (evt.key);
		let data = key
			? /** @type {TimeSeriesData | undefined} */ (evt.data)
			: /** @type {TimeSeriesData | undefined} */ (evt);
		updateChartHover(key, data);
	}

	function onmouseout() {
		updateChartHover(undefined, undefined);
	}

	/**
	 * @param {TimeSeriesData} evt
	 */
	function onpointerup(evt) {
		updateChartFocus(evt.time);
	}

	/** @type {Date[] | undefined} */
	let brushedRange = $state();

	/**
	 * @param {Date[] | undefined} evt
	 */
	function onbrush(evt) {
		brushedRange = evt;
		updateChartXDomain(evt);
	}
</script>

<Meta
	title="The Studio — Lens on Ember"
	description="Lens visualises energy and emissions data from regions around the world using Open Electricity's visualisation components."
	image="/img/preview.jpg"
/>

<PageHeaderSimple>
	{#snippet heading()}
		<div>
			<h1 class="tracking-widest text-center">Lens on Ember</h1>
		</div>
	{/snippet}
	{#snippet subheading()}
		<div>
			<p class="text-sm text-center w-full md:w-[800px] mx-auto">
				Charts from Open Electricity. Data from
				<a href="https://ember-energy.org/" target="_blank">Ember</a>.
			</p>
		</div>
	{/snippet}
</PageHeaderSimple>

<section class="py-12">
	<Filters />
</section>

<main class="p-10 relative">
	{#if fetching}
		<div
			transition:fade
			class="grid place-items-center h-[500px] absolute top-0 left-0 w-full z-50"
		>
			<Loading />
		</div>
	{/if}

	{#if error}
		<div class="grid place-items-center h-[400px]">
			<div class="text-dark-red">Error fetching data</div>
		</div>
	{:else}
		<div class="sticky top-0 pt-2 bg-white z-30" class:blur-sm={fetching}>
			<DateBrushWithContext
				cxtKey={dateBrushCxt.key}
				{brushedRange}
				{onbrush}
				showLineData={false}
			/>
		</div>

		<div
			class="md:grid md:grid-cols-[8fr_6fr] lg:grid-cols-[8fr_4fr] gap-4"
			class:blur-sm={fetching}
		>
			<div class="flex flex-col gap-1">
				{#each Object.values(chartCxts) as cxt (cxt.key)}
					<LensChart
						cxtKey={cxt.key}
						displayOptions={true}
						{onmousemove}
						{onmouseout}
						{onpointerup}
					/>
				{/each}
			</div>

			<div class="relative">
				<Table {chartCxts} />
			</div>
		</div>
	{/if}
</main>
