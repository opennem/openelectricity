<script>
	import FormSelect from '$lib/components/form-elements/Select.svelte';
	/**
	 * @typedef {Object} Props
	 * @property {string} [widthClass]
	 * @property {string} [selectLabel]
	 * @property {any} [options]
	 * @property {string} [selected]
	 */

	/** @type {Props} */
	let {
		widthClass = 'w-[150px]',
		selectLabel = '',
		options = [],
		selected = ''
	} = $props();
</script>

<p class="mb-0 text-xs font-space">{selectLabel}</p>

<div class={`${widthClass} text-sm`}>
	<FormSelect {options} {selected} on:change />
</div>
