<script>
	import { getContext } from 'svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	const { selectedRegion, regionOptions, selectedDataView, dataViewOptions } = getContext('model');
</script>

<div>
	<p class="mb-0">Region:</p>

	<div class="w-[270px]">
		<FormSelect
			options={regionOptions}
			selected={$selectedRegion}
			on:change={(evt) => ($selectedRegion = evt.detail.value)}
		/>
	</div>
</div>

<div class="px-6">
	<p class="mb-0">Data:</p>

	<div class="w-[270px]">
		<FormSelect
			options={dataViewOptions}
			selected={$selectedDataView}
			on:change={(evt) => ($selectedDataView = evt.detail.value)}
		/>
	</div>
</div>
