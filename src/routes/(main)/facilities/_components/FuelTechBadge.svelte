<script>
	import FuelTechIcon from '$lib/components/FuelTechIcon.svelte';
	import FacilityStatusIcon from './FacilityStatusIcon.svelte';
	import { needsDarkText, getFueltechColor } from '../_utils/fueltech-display';

	/**
	 * @type {{
	 *   fueltech_id: string,
	 *   status_id?: string,
	 *   isCommissioning?: boolean,
	 *   size?: 'sm' | 'md',
	 *   darkMode?: boolean,
	 *   overlap?: boolean,
	 *   zIndex?: number
	 * }}
	 */
	let {
		fueltech_id,
		status_id,
		isCommissioning = false,
		size = 'md',
		darkMode = false,
		overlap = false,
		zIndex = 1
	} = $props();

	let bgColor = $derived(getFueltechColor(fueltech_id));
	let isDarkText = $derived(needsDarkText(fueltech_id));

	// Size-specific classes
	let sizeClasses = $derived(
		size === 'sm'
			? {
					padding: 'p-1.5',
					iconSize: 4,
					statusPosition: '-top-[0.1rem] -right-[0.1rem]',
					overlapMargin: 'ml-2'
				}
			: {
					padding: 'p-2',
					iconSize: 8,
					statusPosition: '-top-[0.2rem] -right-[0.2rem]',
					overlapMargin: 'ml-2'
				}
	);

	// Border classes based on dark mode (no border in light mode)
	let borderClasses = $derived(darkMode ? 'border border-white/30' : '');
</script>

<!-- Badge - always visible -->
<span
	class="rounded-full {sizeClasses.padding} block relative {borderClasses} {overlap
		? sizeClasses.overlapMargin
		: ''}"
	class:text-black={isDarkText}
	class:text-white={!isDarkText}
	style="background-color: {bgColor}; z-index: {zIndex};"
	title="{fueltech_id} ({status_id})"
>
	<FuelTechIcon fuelTech={fueltech_id} sizeClass={sizeClasses.iconSize} />
	{#if status_id}
		<div class="absolute {sizeClasses.statusPosition} z-10">
			<FacilityStatusIcon status={status_id} {isCommissioning} />
		</div>
	{/if}
</span>
