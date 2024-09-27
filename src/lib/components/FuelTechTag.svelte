<script>
	import Icon from '$lib/components/Icon.svelte';
	import { fuelTechName } from '$lib/fuel_techs';

	/** @type {FuelTechCode} */
	export let fueltech;
	export let iconSize = 18;
	export let textSize = 13;
	export let showText = true;

	$: highlightTextColor = fueltech === 'solar' ? 'text-black' : 'text-white';
</script>

<div
	class={`inline-flex gap-2 flex-shrink-0 justify-center items-center py-2 px-5 bg-${fueltech} rounded-full  ${highlightTextColor}`}
	style={`font-size: ${textSize}px;`}
>
	<Icon icon={fueltech} size={iconSize} />
	{#if showText}
		<span class="relative top-[1px]">
			<slot>
				{fuelTechName(fueltech)}
			</slot>
		</span>
	{/if}
</div>
