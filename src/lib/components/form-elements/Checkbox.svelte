<script>
	/** @type {import('svelte/elements').FormEventHandler<HTMLInputElement> | null} */
	export let changeHandler = null;
	export let name = '';
	export let label = '';
	export let checked = false;
</script>

<label class={`label ${$$restProps.class}`}>
	<input type="checkbox" on:change|preventDefault={changeHandler} {name} {checked} />
	<span>{label}</span>
</label>

<style lang="postcss">
	.label {
		cursor: pointer;
		display: flex;
		align-items: center;
	}
	.label input[type='checkbox'] {
		appearance: none;
		width: 1.6rem;
		height: 1.6rem;
		background-color: #fff;
		border-radius: 0.2rem;
		border: 0.1rem solid theme(colors.mid-warm-grey);
		margin-right: 0.6rem;
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
