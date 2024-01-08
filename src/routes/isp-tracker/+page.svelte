<script>
	import IspOverview from '$lib/components/isp/Overview.svelte';

	/** @type {{ fuelTechs: string[], outlookEnergyNem: import('$lib/types/isp.types').Isp }} */
	export let data;
</script>

<IspOverview {data} />
