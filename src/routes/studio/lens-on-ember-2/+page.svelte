<script>
	import Meta from '$lib/components/Meta.svelte';
	import fetchData from './page-data-options/fetch.js';
	import { FiltersState, setFiltersContext, getFiltersContext } from './states/filters.svelte.js';
	import Filters from './components/Filters.svelte';

	let { data } = $props();
	setFiltersContext(
		new FiltersState({
			countries: data.countries ?? [],
			selectedRegion: data.region ?? '',
			selectedRange: data.range ?? '',
			selectedInterval: data.interval ?? ''
		})
	);

	let filtersCxt = getFiltersContext();
	let fetching = $state(false);
	/** @type {StatsData[]} */
	let dataset = $state([]);

	$inspect('filtersCxt.countries', filtersCxt.countries);
	$inspect('filtersCxt.selectedRegion', filtersCxt.selectedRegion);
	$inspect('filtersCxt.selectedRange', filtersCxt.selectedRange);
	$inspect('filtersCxt.selectedInterval', filtersCxt.selectedInterval);
	$inspect('dataset', dataset);

	$effect(() => {
		if (filtersCxt.selectedRegion && filtersCxt.selectedRange) {
			fetchData(filtersCxt.selectedRegion, filtersCxt.selectedRange).then((data) => {
				dataset = data;
			});
		}
	});
</script>

<Meta
	title="The Studio — Lens on Ember"
	description="Lens visualises energy and emissions data from regions around the world using Open Electricity's visualisation components."
	image="/img/preview.jpg"
/>

<h2>Lens on Ember 2</h2>

<section class="py-12">
	<Filters />
</section>
