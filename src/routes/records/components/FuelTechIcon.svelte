<script>
	export let fuelTech;
	export let sizeClass = 6;

	/** @type {*} */
	let icon;

	/**
	 * @param {string} fuelTech
	 */
	function fuelTechName(fuelTech) {
		return fuelTech
			.split('_')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join('');
	}

	$: fuelTechIconName = fuelTechName(fuelTech);

	$: {
		import(`$lib/icons/fuel-techs/${fuelTechIconName}Sm.svelte`).then((module) => {
			icon = module.default;
		});
	}
</script>

<div class="size-{sizeClass}">
	<svelte:component this={icon} class="size-{sizeClass}" />
</div>
