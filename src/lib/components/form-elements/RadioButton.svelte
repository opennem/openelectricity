<script>
	/** @type {import('svelte/elements').FormEventHandler<HTMLInputElement> | null} */
	export let changeHandler = null;

	export let name = '';
	export let label = '';
	export let value = '';
	export let checked = false;
</script>

<label class={`label ${$$restProps.class}`}>
	<input
		class="hidden"
		type="radio"
		{value}
		{name}
		{checked}
		on:change|preventDefault={changeHandler}
	/>
	<span class="rounded-md border-solid border-[0.05rem] border-mid-warm-grey p-4 font-sans text-sm"
		>{label}</span
	>
</label>

<style lang="postcss">
	.label {
		cursor: pointer;
		display: flex;
		align-items: center;
	}
	.label input[type='radio']:checked + span {
		border-color: theme(colors.dark-grey);
	}
</style>
