<script>
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import Meta from '$lib/components/Meta.svelte';
	import Filters from './components/Filters.svelte';

	export let data;

	let error = false;
	let errorMsg = '';

	$: console.log(data);
	$: countries = data.countries;
	$: if (data.error) {
		console.error(data.error);
		error = true;
		errorMsg = data.error;
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
		<Filters {countries} />
	</section>
{/if}
