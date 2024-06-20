<script>
	/** @type {import('svelte/elements').FormEventHandler<HTMLInputElement> | null} */
	export let changeHandler = null;

	export let name = '';
	export let label = '';
	export let value = '';
	export let checked = false;
	export let radioOnly = false;
</script>

{#if radioOnly}
	<label class="radio-only" for="">
		<input class="hidden" type="radio" {value} {name} {checked} on:change />

		<div
			class="w-[15px] h-[15px] p-[2px] border rounded-full"
			class:border-mid-grey={checked}
			class:border-mid-warm-grey={!checked}
		>
			{#if checked}
				<span class="block w-[9px] h-[9px] relative bg-dark-grey rounded-full" />
			{/if}
		</div>
	</label>
{:else}
	<label class={`label ${$$restProps.class}`}>
		<input
			class="hidden"
			type="radio"
			{value}
			{name}
			{checked}
			on:change|preventDefault={changeHandler}
		/>
		<span
			class="rounded-md border-solid border-[0.05rem] border-mid-warm-grey p-4 font-sans text-sm"
		>
			{label}
		</span>
	</label>
{/if}

<style lang="postcss">
	.label {
		cursor: pointer;
		display: flex;
		align-items: center;
	}
	.label input[type='radio']:checked + span {
		border-color: theme(colors.dark-grey);
		background-color: theme(colors.light-warm-grey);
	}

	.radio-only {
		display: flex;
		align-items: center;
	}
	.label input[type='radio'] + span {
	}
</style>
