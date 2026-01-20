<script>
	/**
	 * @typedef {Object} Props
	 * @property {(checked: boolean) => void} [onchange]
	 * @property {string} [name]
	 * @property {string} [label]
	 * @property {boolean} [checked]
	 */

	/** @type {Props & { [key: string]: any }} */
	let { onchange, name = '', label = '', checked = false, ...rest } = $props();

	/** @param {Event} event  */
	function handleChange(event) {
		const target = /** @type {HTMLInputElement} */ (event.target);
		onchange?.(target.checked);
		event.preventDefault();
	}
</script>

<label class={`label items-center ${rest.class}`}>
	<input type="checkbox" onchange={handleChange} {name} {checked} />
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
