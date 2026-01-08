<script>
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	/**
	 * @typedef {Object} Props
	 * @property {string} [name]
	 * @property {string} [label]
	 * @property {any} value
	 * @property {any} checked
	 */

	/** @type {Props} */
	let { name = '', label = '', value, checked = $bindable() } = $props();

	let radioId = $derived(`radio-${name}-${value}`);
</script>

<div class="flex items-center select-none">
	<input
		id={radioId}
		name={radioId}
		type="radio"
		{value}
		bind:group={checked}
		onchange={bubble('change')}
		class="h-4 w-4 border-gray-300 text-dark-grey focus:ring-dark-grey"
	/>
	<label for={radioId} class="ml-3 block text-sm font-medium leading-6 text-gray-900">{label}</label
	>
</div>
