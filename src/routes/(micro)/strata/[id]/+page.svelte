<script>
	import StrataChartView from '$lib/stratify/StrataChartView.svelte';

	/** @type {{ data: { chart: any } }} */
	let { data } = $props();

	const chart = $derived(data.chart);
</script>

<svelte:head>
	<title>{chart.title || 'Chart'} — Open Electricity</title>
	{#if chart.description}
		<meta name="description" content={chart.description} />
	{/if}
</svelte:head>

<div class="flex flex-col min-h-dvh bg-white">
	<div class="flex-1 w-full px-6 py-8">
		<StrataChartView {chart} headingTag="h1" showBranding={chart.showBranding ?? true} />
	</div>
</div>
