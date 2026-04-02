<script>
	import BuilderPage from '../_components/BuilderPage.svelte';

	/** @type {{ data: { chartId: string } }} */
	let { data } = $props();
</script>

{#key data.chartId}
	<BuilderPage initialChartId={data.chartId} />
{/key}
