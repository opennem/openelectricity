<script module>
	/** @type {Map<string, any>} */
	const iconCache = new Map();

	/**
	 * Get cached icon or load it
	 * @param {string} iconName
	 */
	async function getIcon(iconName) {
		if (iconCache.has(iconName)) {
			return iconCache.get(iconName);
		}
		const module = await import(`$lib/icons/fuel-techs/${iconName}Sm.svelte`);
		iconCache.set(iconName, module.default);
		return module.default;
	}

</script>

<script>
	import GlobeAlt from '$lib/icons/GlobeAlt.svelte';
	import FacilityStatusIcon from '$lib/components/facilities/FacilityStatusIcon.svelte';
	import { needsDarkText, getFueltechColor } from '$lib/utils/fueltech-display';

	/**
	 * @type {{
	 *   fuelTech: string,
	 *   iconOnly?: boolean,
	 *   iconSize?: number,
	 *   size?: 'sm' | 'md',
	 *   status?: string,
	 *   isCommissioning?: boolean,
	 *   darkMode?: boolean,
	 *   overlap?: boolean,
	 *   zIndex?: number
	 * }}
	 */
	let {
		fuelTech,
		iconOnly = false,
		iconSize = 6,
		size = 'md',
		status,
		isCommissioning = false,
		darkMode = false,
		overlap = false,
		zIndex = 1
	} = $props();

	/**
	 * @param {string} ft
	 */
	function fuelTechIconName(ft) {
		return ft
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join('');
	}

	let iconPromise = $derived(getIcon(fuelTechIconName(fuelTech)));

	// Badge-mode derived values
	let bgColor = $derived(getFueltechColor(fuelTech));
	let isDarkText = $derived(needsDarkText(fuelTech));

	let sizeClasses = $derived(
		size === 'sm'
			? {
					padding: 'p-1.5',
					icon: 4,
					statusPosition: '-top-[0.1rem] -right-[0.1rem]',
					overlapMargin: '-ml-1.5'
				}
			: {
					padding: 'p-2',
					icon: 8,
					statusPosition: '-top-[0.2rem] -right-[0.2rem]',
					overlapMargin: 'ml-2'
				}
	);

	let borderClasses = $derived(darkMode ? 'border border-white/30' : '');
</script>

{#if iconOnly}
	{#await iconPromise}
		<GlobeAlt class="size-{iconSize}" />
	{:then SvelteComponent}
		<SvelteComponent class="size-{iconSize}" />
	{/await}
{:else}
	<div
		class="rounded-full {sizeClasses.padding} relative {borderClasses} {overlap
			? sizeClasses.overlapMargin
			: ''}"
		class:text-black={isDarkText}
		class:text-white={!isDarkText}
		style="background-color: {bgColor}; z-index: {zIndex};"
		title="{fuelTech} ({status})"
	>
		{#await iconPromise}
			<GlobeAlt class="size-{sizeClasses.icon}" />
		{:then SvelteComponent}
			<SvelteComponent class="size-{sizeClasses.icon}" />
		{/await}
		{#if status && (status !== 'operating' || isCommissioning)}
			<div class="absolute {sizeClasses.statusPosition} z-10">
				<FacilityStatusIcon {status} {isCommissioning} />
			</div>
		{/if}
	</div>
{/if}
