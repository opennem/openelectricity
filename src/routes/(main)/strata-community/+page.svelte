<script>
	import Meta from '$lib/components/Meta.svelte';
	import PageHeaderSimple from '$lib/components/PageHeaderSimple.svelte';
	import StrataChartCard from '$lib/stratify/StrataChartCard.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {import('./$types').PageData} data
	 */

	/** @type {Props} */
	let { data } = $props();

	let charts = $derived(data.charts);
</script>

<Meta title="Strata Community" />

<PageHeaderSimple>
	{#snippet heading()}
		<div>
			<h1 class="tracking-widest text-center">Strata Community</h1>
		</div>
	{/snippet}
	{#snippet subheading()}
		<div>
			<p class="text-sm text-center w-full md:w-200 mx-auto">
				Charts created and published by the community using Stratify (closed beta), our charting
				tool. Explore insights into Australia's energy landscape.
			</p>
		</div>
	{/snippet}
</PageHeaderSimple>

<main class="container max-w-none py-12 md:py-16">
	{#if charts.length === 0}
		<p class="text-mid-grey">No published charts yet.</p>
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 gap-8">
			{#each charts as chart (chart._id)}
				<StrataChartCard {chart} headingTag="h3" maxHeight="max-h-250" />
			{/each}
		</div>
	{/if}
</main>
