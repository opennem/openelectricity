<script>
	import Icon from '$lib/components/Icon.svelte';
	import { fuelTechName } from '$lib/fuel_techs';

	/** @type {FuelTechCode} */
	export let fueltech;
	export let iconSize = 18;
	export let textSize = 13;
	export let showText = true;
	export let pxClass = 'px-5';
	export let showBgColour = true;

	$: bgClass = showBgColour ? `bg-${fueltech}` : '';
	$: highlightTextColor = showBgColour
		? fueltech === 'solar'
			? 'text-black'
			: 'text-white'
		: 'text-black';
</script>

<div
	class={`inline-flex gap-2 flex-shrink-0 justify-center items-center py-2 ${pxClass} ${bgClass} rounded-full  ${highlightTextColor}`}
	style={`font-size: ${textSize}px;`}
	title={fuelTechName(fueltech)}
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
