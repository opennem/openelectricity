<script>
	import Icon from '$lib/components/Icon.svelte';
	import { fuelTechName } from '$lib/fuel_techs';

	/** @type {FuelTechCode} */
	export let fueltech;

	$: highlightTextColor = fueltech === 'solar' ? 'text-black' : 'text-white';
</script>

<span
	class={`inline-flex gap-2 flex-shrink-0 justify-center items-center py-2 px-5 bg-${fueltech} rounded-full text-[13px] ${highlightTextColor}`}
>
	<Icon icon={fueltech} size={18} />
	<span class="relative top-[1px]">
		<slot>
			{fuelTechName(fueltech)}
		</slot>
	</span>
</span>
