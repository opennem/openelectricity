<script>
	import Switch from '$lib/components/Switch.svelte';

	let { store } = $props();

	const {
		allowPrefixSwitch,
		allowedPrefixes,
		displayPrefix,
		baseUnit,
		chartTypeOptions,
		chartType,
		dataScaleOptions,
		dataScaleType,
		curveType,
		curveOptions
	} = store;

	// $: console.log('allowedPrefixes', $allowedPrefixes, $displayPrefix, $baseUnit);
	let unitOptions = $derived($allowedPrefixes.map((/** @type {string} */ prefix) => {
		return {
			label: `${prefix}${$baseUnit}`,
			value: prefix
		};
	}));
</script>

<div class="grid grid-cols-5 gap-4 items-center">
	<span class="font-space font-semibold uppercase text-xs text-mid-grey">Data</span>
	<div class="col-span-4">
		<Switch
			buttons={$dataScaleOptions}
			selected={$dataScaleType}
			xPad={4}
			yPad={2}
			textSize="xs"
			on:change={(evt) => ($dataScaleType = evt.detail.value)}
		/>
	</div>
</div>

<div class="grid grid-cols-5 gap-4 items-center">
	<span class="font-space font-semibold uppercase text-xs text-mid-grey">Chart</span>
	<div class="col-span-4">
		<Switch
			buttons={$chartTypeOptions}
			selected={$chartType}
			xPad={4}
			yPad={2}
			textSize="xs"
			on:change={(evt) => ($chartType = evt.detail.value)}
		/>
	</div>
</div>

<div class="grid grid-cols-5 gap-4 items-center">
	<span class="font-space font-semibold uppercase text-xs text-mid-grey">Style</span>
	<div class="col-span-4">
		<Switch
			buttons={$curveOptions}
			selected={$curveType}
			xPad={4}
			yPad={2}
			textSize="xs"
			on:change={(evt) => ($curveType = evt.detail.value)}
		/>
	</div>
</div>

{#if $allowPrefixSwitch}
	<div class="grid grid-cols-5 gap-4 items-center">
		<span class="font-space font-semibold uppercase text-xs text-mid-grey">Units</span>
		<div class="col-span-4">
			<Switch
				buttons={unitOptions}
				selected={$displayPrefix}
				xPad={4}
				yPad={2}
				textSize="xs"
				on:change={(evt) => ($displayPrefix = evt.detail.value)}
			/>
		</div>
	</div>
{/if}
