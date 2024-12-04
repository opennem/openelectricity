<script>
	import Switch from '$lib/components/Switch.svelte';

	export let store;

	const { allowPrefixSwitch, allowedPrefixes, displayPrefix, baseUnit, curveType, curveOptions } =
		store;

	// $: console.log('allowedPrefixes', $allowedPrefixes, $displayPrefix, $baseUnit);
	$: unitOptions = $allowedPrefixes.map((/** @type {string} */ prefix) => {
		return {
			label: `${prefix}${$baseUnit}`,
			value: prefix
		};
	});

	/**
	 * @param {string} value
	 */
	function handleUnitChange(value) {
		$displayPrefix = value;
	}

	/**
	 * @param {string} value
	 */
	function handleStyleChange(value) {
		$curveType = value;
	}
</script>

<!-- 
<div>
	<h6>Data</h6>
	<Switch
		buttons={[
			{
				label: 'Absolute',
				value: 'absolute'
			},
			{
				label: 'Proportion',
				value: 'proportion'
			},
			{
				label: 'Change',
				value: 'change'
			},
			{
				label: 'Growth',
				value: 'growth'
			}
		]}
		selected={'absolute'}
	/>
</div>

<div>
	<h6>Style</h6>
	<Switch
		buttons={[
			{
				label: 'Smooth',
				value: 'smooth'
			},
			{
				label: 'Straight',
				value: 'straight'
			},
			{
				label: 'Step',
				value: 'step'
			}
		]}
		selected={'straight'}
	/>
</div> -->

<div class="flex gap-4 items-center">
	<span class="font-space font-semibold uppercase text-xs text-mid-grey">Style</span>
	<Switch
		buttons={$curveOptions}
		selected={$curveType}
		xPad={4}
		yPad={2}
		textSize="xs"
		on:change={(evt) => handleStyleChange(evt.detail.value)}
	/>
</div>

{#if $allowPrefixSwitch}
	<div class="flex gap-4 items-center">
		<span class="font-space font-semibold uppercase text-xs text-mid-grey">Units</span>
		<Switch
			buttons={unitOptions}
			selected={$displayPrefix}
			xPad={4}
			yPad={2}
			textSize="xs"
			on:change={(evt) => handleUnitChange(evt.detail.value)}
		/>
	</div>
{/if}
