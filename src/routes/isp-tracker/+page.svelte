<script>
	import InfoGraphicISP from '$lib/components/info-graphics/integrated-system-plan/index.svelte';

	/** @type {{ fuelTechs: string[], outlookEnergyNem: import('$lib/types/isp.types').Isp, historyEnergyNemData: import('$lib/types/stats.types').StatsData[] }} */
	export let data;
</script>

<div class="container">
	<InfoGraphicISP {data} />
</div>
