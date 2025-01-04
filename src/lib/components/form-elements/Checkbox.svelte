<script>
	import { preventDefault } from 'svelte/legacy';

	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	
	/**
	 * @typedef {Object} Props
	 * @property {import('svelte/elements').FormEventHandler<HTMLInputElement> | null} [changeHandler]
	 * @property {string} [name]
	 * @property {string} [label]
	 * @property {boolean} [checked]
	 */

	/** @type {Props & { [key: string]: any }} */
	let {
		changeHandler = null,
		name = '',
		label = '',
		checked = false,
		...rest
	} = $props();

	/** @param {*} event  */
	function handleChange(event) {
		dispatch('change', { checked: event.target.checked });

		if (changeHandler) {
			changeHandler(event);
		}
	}
</script>

<label class={`label items-center ${rest.class}`}>
	<input type="checkbox" onchange={preventDefault(handleChange)} {name} {checked} />
	<span>{label}</span>
</label>

<style lang="postcss">
	.label {
		cursor: pointer;
		display: flex;
	}
	.label input[type='checkbox'] {
		cursor: pointer;
		appearance: none;
		width: 1.6rem;
		height: 1.6rem;
		background-color: #fff;
		border-radius: 0.2rem;
		border: 0.1rem solid theme(colors.mid-warm-grey);
	}
	.label input[type='checkbox']:focus {
		outline: none;
		box-shadow: none;
	}
	.label input[type='checkbox']:checked {
		border-color: theme(colors.dark-grey);
		background-color: theme(colors.light-warm-grey);
		background-image: url(/img/check.svg);
		background-size: 1rem;
		background-position: center;
		background-repeat: no-repeat;
		outline: none;
		box-shadow: none;
	}
</style>
