<script>
	import Checkbox from '$lib/components/form-elements/CheckboxNew.svelte';
	import { formatFyTickX } from '$lib/utils/formatters';

	/**
	 * @typedef {Object} Props
	 * @property {boolean} [includeBatteryAndLoads]
	 * @property {any} [hoverTime]
	 * @property {boolean} [showCheckbox]
	 * @property {boolean} [showLabel]
	 * @property {() => void} [onchange]
	 */

	/** @type {Props} */
	let { includeBatteryAndLoads = false, hoverTime = null, showCheckbox = true, showLabel = true, onchange } = $props();
</script>

<header class="flex items-center justify-between h-12 px-10 md:px-0">
	<div>
		{#if showCheckbox}
			<Checkbox
				name="includeBatteryAndLoads"
				label="Include Storage and Loads"
				checked={includeBatteryAndLoads}
				{onchange}
			/>
		{/if}
	</div>

	{#if showLabel}
		<span class="font-semibold text-base">
			{hoverTime ? formatFyTickX(hoverTime) : ''}
		</span>
	{/if}
</header>
