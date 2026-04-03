<script>
	import Meta from '$lib/components/Meta.svelte';
	import StrataChartCard from '$lib/stratify/StrataChartCard.svelte';

	/** @type {{ data: { chart: any } }} */
	let { data } = $props();

	const chart = $derived(data.chart);
</script>

<Meta title={chart.title || 'Chart'} description={chart.description || ''} />

<main class="container py-12 md:py-16">
	<StrataChartCard {chart} headingTag="h1" showOpen={false} />
</main>
