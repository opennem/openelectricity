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
</script>

{#await import(`$lib/icons/fuel-techs/${fuelTechIconName}Sm.svelte`)}
	<div class="size-{sizeClass}">
		<GlobeAlt class="size-{sizeClass}" />
	</div>
{:then module}
	{@const SvelteComponent = module.default}
	<div class="size-{sizeClass}">
		<SvelteComponent class="size-{sizeClass}" />
	</div>
{/await}
