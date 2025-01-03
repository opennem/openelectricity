<script>
	/**
	 * @typedef {Object} Props
	 * @property {any} fuelTech
	 * @property {number} [sizeClass]
	 */

	/** @type {Props} */
	let { fuelTech, sizeClass = 6 } = $props();

	/** @type {*} */
	let icon = $derived(module.default);

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

	

	const SvelteComponent = $derived(icon);
</script>

<div class="size-{sizeClass}">
	<SvelteComponent class="size-{sizeClass}" />
</div>
