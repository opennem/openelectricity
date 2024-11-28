<script>
	import { setContext, getContext } from 'svelte';
	import { colourReducer } from '$lib/stores/theme';

	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import Filters from './components/Filters.svelte';

	import dataVizStore from '$lib/components/charts/stores/data-viz';
	import filtersStore from './stores/filters';

	export let data;

	const dataVizStoreNames = [
		{
			name: 'energy-data-viz',
			chart: 'generation'
		},
		{
			name: 'emissions-data-viz',
			chart: 'emissions'
		}
	];
	dataVizStoreNames.forEach(({ name }) => {
		setContext(name, dataVizStore());
	});
	setContext('ember-filters', filtersStore());

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
	const { selectedRegion } = getContext('ember-filters');

	let error = false;
	let errorMsg = '';
	let fetching = false;
	let dataset;

	$: console.log(data);
	$: countries = data.countries;
	$: if (data.error) {
		console.error(data.error);
		error = true;
		errorMsg = data.error;
	}

	$: fetchData($selectedRegion);

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
	<section class="md:container py-12">
		{#if countries}
			<Filters {countries} />
		{/if}

		{#if fetching}
			<p class="text-center">Fetching data...</p>
		{/if}
	</section>
{/if}
