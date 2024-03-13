<script>
	import Icon from '$lib/components/Icon.svelte';
	import { fuelTechName } from '$lib/fuel_techs';

	/** @type {FuelTechCode} */
	export let fueltech;

	$: highlightTextColor = fueltech === 'gas' || fueltech === 'solar' ? 'text-black' : 'text-white';
</script>

<span
	class={`inline-flex gap-2 flex-shrink-0 justify-center items-center h-12 px-4 bg-${fueltech} rounded-full text-xs ${highlightTextColor}`}
>
	<Icon icon={fueltech} size={16} />
	<slot>
		{fuelTechName(fueltech)}
	</slot>
</span>
