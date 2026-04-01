<script>
	import LoginGate from '$lib/components/auth/LoginGate.svelte';
	import BuilderPage from '../_components/BuilderPage.svelte';

	/** @type {{ data: { chartId: string } }} */
	let { data } = $props();
</script>

<LoginGate redirectUrl="/stratify/{data.chartId}">
	<BuilderPage initialChartId={data.chartId} />
</LoginGate>
