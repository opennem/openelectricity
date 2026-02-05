<script>
	import Checkbox from '$lib/components/form-elements/CheckboxNew.svelte';
	import { formatFyTickX } from '$lib/utils/formatters';

	/**
	 * @typedef {Object} Props
	 * @property {boolean} [includeBatteryAndLoads]
	 * @property {any} [hoverTime]
	 * @property {() => void} [onchange]
	 */

	/** @type {Props} */
	let { includeBatteryAndLoads = false, hoverTime = null, onchange } = $props();
</script>

<header class="flex justify-between h-12 px-10 md:px-0">
	<div>
		<Checkbox
			name="includeBatteryAndLoads"
			label="Include Storage and Loads"
			checked={includeBatteryAndLoads}
			{onchange}
		/>
	</div>

	<span class="font-semibold">
		{hoverTime ? formatFyTickX(hoverTime) : ''}
	</span>
</header>
