<script>
	import Icon from '$lib/components/Icon.svelte';
	import { fuelTechName } from '$lib/fuel_techs';

	
	/**
	 * @typedef {Object} Props
	 * @property {FuelTechCode} fueltech
	 * @property {number} [iconSize]
	 * @property {number} [textSize]
	 * @property {boolean} [showText]
	 * @property {string} [pxClass]
	 * @property {boolean} [showBgColour]
	 * @property {import('svelte').Snippet} [children]
	 */

	/** @type {Props} */
	let {
		fueltech,
		iconSize = 18,
		textSize = 13,
		showText = true,
		pxClass = 'px-5',
		showBgColour = true,
		children
	} = $props();

	let bgClass = $derived(showBgColour ? `bg-${fueltech}` : '');
	let highlightTextColor = $derived(showBgColour
		? fueltech === 'solar'
			? 'text-black'
			: 'text-white'
		: 'text-black');
</script>

<div
	class={`inline-flex gap-2 flex-shrink-0 justify-center items-center py-2 ${pxClass} ${bgClass} rounded-full  ${highlightTextColor}`}
	style={`font-size: ${textSize}px;`}
	title={fuelTechName(fueltech)}
>
	<Icon icon={fueltech} size={iconSize} />
	{#if showText}
		<span class="relative top-[1px]">
			{#if children}{@render children()}{:else}
				{fuelTechName(fueltech)}
			{/if}
		</span>
	{/if}
</div>
