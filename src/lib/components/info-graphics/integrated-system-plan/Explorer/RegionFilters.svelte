<script>
	import { getContext } from 'svelte';
	import FormSelect from '$lib/components/form-elements/Select.svelte';

	const { selectedRegion, regionOptions } = getContext('model');
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
