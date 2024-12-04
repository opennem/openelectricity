<script>
	import { setContext, getContext } from 'svelte';
	import { startOfYear } from 'date-fns';
	import { colourReducer } from '$lib/stores/theme';
	import { formatFyTickX } from '$lib/utils/formatters';

	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import Filters from './components/Filters.svelte';
	import Chart from './components/Chart.svelte';
	import Table from './components/Table.svelte';

	import dataVizStore from '$lib/components/charts/stores/data-viz';
	import filtersStore from './stores/filters';

	import process from './page-data-options/process';

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
	const { focusTime: energyFocusTime } = dataVizStores['energy-data-viz'];

	const { selectedRegion, countries } = getContext('filters');

	let error = false;
	let errorMsg = '';
	let fetching = false;
	/** @type {StatsData[]} */
	let dataset;
	/** @type {string[]} */
	let hiddenRowNames = [];

	$: console.log(data);
	$: $countries = data.countries;
	$: if (data.error) {
		console.error(data.error);
		error = true;
		errorMsg = data.error;
	}

	$: fetchData($selectedRegion);
	$: if (dataset && dataset.length > 0) {
		const energyData = dataset.filter((d) => d.type === 'energy');
		const emissionsData = dataset.filter((d) => d.type === 'emissions');

		// Process data
		const processed = process({ history: energyData, unit: 'TWh', colourReducer: $colourReducer });
		const processedEmissions = process({
			history: emissionsData,
			unit: 'MtCO2e',
			colourReducer: $colourReducer
		});

		dataVizStoreNames.forEach(({ name }) => {
			const store = dataVizStores[name];
			switch (name) {
				case 'energy-data-viz':
					updateDataVizStore(
						'Energy',
						store,
						processed.stats,
						processed.timeseries,
						'T',
						['G', 'T'],
						'h-[400px] md:h-[450px]'
					);
					break;

				case 'emissions-data-viz':
					updateDataVizStore(
						'Emissions',
						store,
						processedEmissions.stats,
						processedEmissions.timeseries,
						'M',
						['M', 'G'],
						'h-[300px] md:h-[350px]'
					);
					break;
			}
		});
	}

	/**
	 * @param {string} region
	 */
	async function fetchData(region) {
		if (region) {
			fetching = true;
			const res = await fetch(`/api/ember-bridge/?region=${region}`);
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
		store.chartType.set('area');
		store.curveType.set('straight');
		store.chartHeightClasses.set(chartHeightClasses);
		store.baseUnit.set(stats.baseUnit);
		store.prefix.set(stats.prefix);
		store.displayPrefix.set(displayPrefix); // TODO: set from
		store.allowedPrefixes.set(allowedPrefixes);
		store.xTicks.set([
			startOfYear(new Date('2000-01-01')),
			startOfYear(new Date('2005-01-01')),
			startOfYear(new Date('2010-01-01')),
			startOfYear(new Date('2015-01-01')),
			startOfYear(new Date('2020-01-01')),
			startOfYear(new Date('2023-01-01'))
		]);
		store.formatTickX.set(formatFyTickX);
	}

	/**
	 * @param {CustomEvent<{ name: string, isMetaPressed: boolean, allNames: string[] }>} evt
	 */
	function toggleRow(evt) {
		const name = evt.detail.name;
		const isMetaPressed = evt.detail.isMetaPressed;
		const allNames = evt.detail.allNames;

		if (isMetaPressed) {
			hiddenRowNames = allNames.filter((n) => n !== name);
		} else {
			if (hiddenRowNames.includes(name)) {
				hiddenRowNames = hiddenRowNames.filter((n) => n !== name);
			} else {
				hiddenRowNames = [...hiddenRowNames, name];

				if (hiddenRowNames.length === allNames.length) {
					hiddenRowNames = [];
				}
			}
		}
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
</script>

<Meta
	title="The Studio — Lens"
	description="Lens visualises energy and emissions data from regions around the world using Open Electricity's visualisation components."
	image="/img/preview.jpg"
/>

<PageHeaderSimple>
	<div slot="main-heading">
		<h1 class="tracking-widest text-center">Lens</h1>
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
	<section class="md:container py-12 flex justify-center">
		{#if $countries && $countries.length}
			<Filters countries={$countries} />
		{/if}
	</section>
{/if}

<div
	class="max-w-none py-10 md:p-16 md:flex gap-12 z-30 border-b border-t border-warm-grey pb-24 mb-24"
>
	<section class="w-full flex flex-col gap-12 md:w-[60%]" class:blur-sm={fetching}>
		{#each dataVizStoreNames as { name, chart }}
			<Chart
				hiddenRowNames={hiddenRowNames.map((d) => `${d}.${chart}`)}
				store={dataVizStores[name]}
				on:mousemove={handleMousemove}
				on:mouseout={handleMouseout}
				on:pointerup={handlePointerup}
			/>
		{/each}
	</section>

	<section class="md:w-[40%] mt-6" class:blur-sm={fetching}>
		<Table {hiddenRowNames} on:row-click={toggleRow} />
	</section>
</div>
