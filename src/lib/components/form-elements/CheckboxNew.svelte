<script>
	import IconCheckMark from '$lib/icons/CheckMark.svelte';

	/**
	 * @typedef {Object} Props
	 * @property {string} [name]
	 * @property {string} [label]
	 * @property {boolean} [checked]
	 * @property {boolean} [indeterminate]
	 * @property {() => void} [onchange]
	 */

	/** @type {Props} */
	let {
		name = '',
		label = '',
		checked = $bindable(false),
		indeterminate = $bindable(false),
		onchange
	} = $props();

	function handleChange() {
		onchange?.();
	}
</script>

<label for={name} class="relative flex items-center select-none">
	<input
		id={name}
		aria-describedby="comments-description"
		{name}
		type="checkbox"
		bind:checked
		bind:indeterminate
		onchange={handleChange}
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
