<script>
	import { preventDefault } from 'svelte/legacy';

	/**
	 * @typedef {Object} Props
	 * @property {((event: Event, ...args: unknown[]) => void) | null} [changeHandler]
	 * @property {string} [name]
	 * @property {string} [label]
	 * @property {string} [value]
	 * @property {boolean} [checked]
	 */

	/** @type {Props & { [key: string]: any }} */
	let {
		changeHandler = null,
		name = '',
		label = '',
		value = '',
		checked = false,
		...rest
	} = $props();
</script>

<label class={`label relative ${rest.class ?? ''}`}>
	<input
		class="peer absolute inset-0 size-full cursor-pointer opacity-0"
		type="radio"
		{value}
		{name}
		{checked}
		onchange={preventDefault(
			/** @type {(event: Event, ...args: unknown[]) => void} */ (changeHandler)
		)}
	/>
	<span
		class="rounded-md border-solid border-[0.05rem] border-mid-warm-grey p-4 font-sans text-sm peer-checked:border-dark-grey peer-checked:bg-light-warm-grey peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-dark-grey"
	>
		{label}
	</span>
</label>

<style lang="postcss">
	.label {
		cursor: pointer;
		display: flex;
		align-items: center;
	}
</style>
