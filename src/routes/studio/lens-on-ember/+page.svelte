<script>
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

	let { data } = $props();
	let { chartCxts, dateBrushCxt, filtersCxt } = init(data);

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
		// loop through all charts and update the hover time and key
		Object.values(chartCxts).forEach((cxt) => {
			cxt.hoverTime = hoverData ? hoverData.time : undefined;
			cxt.hoverKey = hoverKey;
		});
	}

	/**
	 * @param {number} time
	 */
	function updateChartFocus(time) {
		Object.values(chartCxts).forEach((cxt) => {
			const isSame = cxt.focusTime === time;
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
	<!-- @migration-task: migrate this slot by hand, `main-heading` is an invalid identifier -->
	<div slot="main-heading">
		<h1 class="tracking-widest text-center">Lens on Ember</h1>
	</div>
	<!-- @migration-task: migrate this slot by hand, `sub-heading` is an invalid identifier -->
	<div slot="sub-heading">
		<p class="text-sm text-center w-full md:w-[800px] mx-auto">
			Charts from Open Electricity. Data from
			<a href="https://ember-energy.org/" target="_blank">Ember</a>.
		</p>
	</div>
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
	{/if}

	{#if error}
		<div class="grid place-items-center h-[400px]">
			<div class="text-dark-red">Error fetching data</div>
		</div>
	{:else}
		<div
			class="md:grid md:grid-cols-[8fr_6fr] lg:grid-cols-[8fr_4fr] gap-4"
			class:blur-sm={fetching}
		>
			<div class="flex flex-col gap-1">
				{#each Object.values(chartCxts) as cxt}
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

		<div class="sticky bottom-8 pt-4 bg-white z-30" class:blur-sm={fetching}>
			<DateBrushWithContext cxtKey={dateBrushCxt.key} {brushedRange} {onbrush} />
		</div>
	{/if}
</main>
