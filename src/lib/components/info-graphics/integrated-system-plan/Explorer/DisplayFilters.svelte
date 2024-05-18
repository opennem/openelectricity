<script>
	import { getContext } from 'svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	const { selectedFuelTechGrouping, fuelTechGroupingOptions } = getContext('projection-explorer');
</script>

<div>
	<p class="mb-0">Grouping:</p>

	<div class="w-[270px]">
		<FormSelect
			options={fuelTechGroupingOptions}
			selected={$selectedFuelTechGrouping}
			on:change={(evt) => ($selectedFuelTechGrouping = evt.detail.value)}
		/>
	</div>
</div>
