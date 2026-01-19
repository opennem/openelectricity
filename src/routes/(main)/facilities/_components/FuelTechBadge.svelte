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
	 *   hidden?: boolean,
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
		hidden = false,
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
					statusPosition: '-top-[0.1rem] -left-[0.1rem]',
					overlapMargin: '-ml-3 group-hover/badges:ml-0.5',
					hiddenExpand: 'group-hover/badges:p-1.5'
				}
			: {
					padding: 'p-2',
					iconSize: 6,
					statusPosition: 'top-[0.1rem] left-[0.1rem]',
					overlapMargin: '-ml-5 group-hover/badges:ml-1',
					hiddenExpand: 'group-hover/badges:p-2'
				}
	);

	// Border classes based on dark mode
	let borderClasses = $derived(darkMode ? 'border border-white/30' : 'border-2 border-white');
</script>

{#if hidden}
	<!-- Hidden badge that reveals on hover -->
	<span
		class="rounded-full block relative shadow-sm transition-all duration-200 ease-out p-0 w-0 opacity-0 scale-0 {sizeClasses.hiddenExpand} group-hover/badges:w-auto group-hover/badges:ml-1 group-hover/badges:opacity-100 group-hover/badges:scale-100 {borderClasses}"
		class:text-black={isDarkText}
		class:text-white={!isDarkText}
		style="background-color: {bgColor}; z-index: {zIndex};"
		title="{fueltech_id} ({status_id})"
	>
		<FuelTechIcon fuelTech={fueltech_id} sizeClass={sizeClasses.iconSize} />
		{#if status_id}
			<div class="absolute {sizeClasses.statusPosition} z-10">
				<FacilityStatusIcon status={status_id} {isCommissioning} size="small" />
			</div>
		{/if}
	</span>
{:else}
	<!-- Standard visible badge -->
	<span
		class="rounded-full {sizeClasses.padding} block relative shadow-sm transition-[margin] duration-200 ease-out {borderClasses} {overlap
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
				<FacilityStatusIcon status={status_id} {isCommissioning} size="small" />
			</div>
		{/if}
	</span>
{/if}
