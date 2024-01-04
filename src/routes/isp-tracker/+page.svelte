<script>
	import IspSection from '$lib/components/homepage/IspSection.svelte';

	/** @type {{ fuelTechs: string[], outlookEnergyNem: import('$lib/types/isp.types').Isp }} */
	export let data;
</script>

<IspSection {data} />
