<script>
	import ispData from '$lib/isp';
	import InfoGraphicISP from '$lib/components/info-graphics/integrated-system-plan/index.svelte';

	/** @type {*} */
	export let data;
	const { historyEnergyNemData } = data;
	const isp = ispData();
	const outlookEnergyNem = isp.parsed2024.outlookEnergyNem;
</script>

<div class="bg-light-warm-grey py-6 md:py-4">
	<div class="container max-w-none lg:container md:flex items-center gap-3 md:gap-6">
		<span
			class="inline-block whitespace-nowrap uppercase font-space font-medium tracking-widest text-xs bg-warm-grey py-2 px-4 rounded-full mb-2 md:mb-0"
		>
			Public Beta
		</span>
		<div class="text-mid-grey text-sm font-light">
			This feature is in development. A more detailed Future Scenarios explorer will be available
			soon.
		</div>
	</div>
</div>

<div class="mt-12 md:mt-24">
	<InfoGraphicISP data={{ ispData: isp, outlookEnergyNem, historyEnergyNemData }} />
</div>
