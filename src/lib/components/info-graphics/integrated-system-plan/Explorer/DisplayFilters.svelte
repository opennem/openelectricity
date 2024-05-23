<script>
	import { getContext } from 'svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	const { selectedFuelTechGrouping, fuelTechGroupingOptions } = getContext('projection-explorer');
	const { selectedDisplayView, displayViewOptions } = getContext('model');
</script>

<div>
	<p class="mb-0">View:</p>

	<div class="w-[270px]">
		<FormSelect
			options={displayViewOptions}
			selected={$selectedDisplayView}
			on:change={(evt) => ($selectedDisplayView = evt.detail.value)}
		/>
	</div>
</div>
<div class="px-6">
	<p class="mb-0">Grouping:</p>

	<div class="w-[270px]">
		<FormSelect
			options={fuelTechGroupingOptions}
			selected={$selectedFuelTechGrouping}
			on:change={(evt) => ($selectedFuelTechGrouping = evt.detail.value)}
		/>
	</div>
</div>
