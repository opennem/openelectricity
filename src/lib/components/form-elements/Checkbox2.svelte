<script>
	/**
	 * @typedef {Object} Props
	 * @property {string} [name]
	 * @property {string} [label]
	 * @property {boolean} [checked]
	 * @property {boolean} [indeterminate]
	 * @property {(event: Event) => void} [onchange]
	 */

	/** @type {Props} */
	let {
		name = '',
		label = '',
		checked = $bindable(false),
		indeterminate = $bindable(false),
		onchange
	} = $props();
</script>

<div class="relative flex items-center select-none">
	<input
		id={name}
		aria-describedby="comments-description"
		{name}
		type="checkbox"
		bind:checked
		bind:indeterminate
		{onchange}
		class="size-6 rounded-sm border-gray-300 text-dark-grey focus:ring-dark-grey"
	/>
	<div class="ml-3 text-sm">
		<label for={name}>{label}</label>
	</div>
</div>
