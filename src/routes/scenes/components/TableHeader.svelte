<script>
	import Checkbox from '$lib/components/form-elements/CheckboxNew.svelte';
	import { formatFyTickX } from '$lib/utils/formatters';

	export let includeBatteryAndLoads = false;
	export let hoverTime = null;
</script>

<header class="flex justify-between h-12">
	<div>
		<Checkbox
			name="includeBatteryAndLoads"
			label="Include Battery and Loads"
			checked={includeBatteryAndLoads}
			on:change
		/>
	</div>

	<span class="font-semibold">
		{hoverTime ? formatFyTickX(hoverTime) : ''}
	</span>
</header>
