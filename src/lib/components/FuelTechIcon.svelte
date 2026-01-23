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

	/**
	 * @typedef {Object} Props
	 * @property {any} fuelTech
	 * @property {number} [sizeClass]
	 */

	/** @type {Props} */
	let { fuelTech, sizeClass = 6 } = $props();

	/**
	 * @param {string} fuelTech
	 */
	function fuelTechName(fuelTech) {
		return fuelTech
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join('');
	}

	let fuelTechIconName = $derived(fuelTechName(fuelTech));
	let iconPromise = $derived(getIcon(fuelTechIconName));
</script>

{#await iconPromise}
	<div class="size-{sizeClass}">
		<GlobeAlt class="size-{sizeClass}" />
	</div>
{:then SvelteComponent}
	<div class="size-{sizeClass}">
		<SvelteComponent class="size-{sizeClass}" />
	</div>
{/await}
