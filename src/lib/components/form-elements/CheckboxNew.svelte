<script>
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	import IconCheckMark from '$lib/icons/CheckMark.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string} [name]
	 * @property {string} [label]
	 * @property {boolean} [checked]
	 * @property {boolean} [indeterminate]
	 */

	/** @type {Props} */
	let {
		name = '',
		label = '',
		checked = $bindable(false),
		indeterminate = $bindable(false)
	} = $props();
</script>

<label for={name} class="relative flex items-center select-none">
	<input
		id={name}
		aria-describedby="comments-description"
		{name}
		type="checkbox"
		bind:checked
		bind:indeterminate
		onchange={bubble('change')}
		class="hidden size-6 rounded-sm border-gray-300 text-dark-grey focus:ring-dark-grey"
	/>

	<div class="border border-mid-warm-grey rounded-sm size-7" class:bg-warm-grey={checked}>
		{#if checked}
			<IconCheckMark class="size-6" />
		{/if}
	</div>

	<div class="ml-3 text-sm">
		{label}
	</div>
</label>
