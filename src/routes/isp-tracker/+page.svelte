<script>
	import IspOverview from '$lib/components/isp/Overview.svelte';

	/** @type {{ fuelTechs: string[], outlookEnergyNem: import('$lib/types/isp.types').Isp, historyEnergyNemData: import('$lib/types/stats.types').StatsData[] }} */
	export let data;
</script>

<div class="container">
	<IspOverview {data} />
</div>
