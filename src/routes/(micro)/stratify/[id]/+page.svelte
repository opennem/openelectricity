<script>
	import BuilderPage from '../_components/BuilderPage.svelte';

	/** @type {{ data: { chartId: string } }} */
	let { data } = $props();
</script>

<BuilderPage initialChartId={data.chartId} />
