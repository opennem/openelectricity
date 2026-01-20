<script>
	import { createBubbler, preventDefault } from 'svelte/legacy';

	const bubble = createBubbler();

	/**
	 * @typedef {Object} Props
	 * @property {import('svelte/elements').FormEventHandler<HTMLInputElement> | null} [changeHandler]
	 * @property {string} [name]
	 * @property {string} [label]
	 * @property {string} [value]
	 * @property {boolean} [checked]
	 * @property {boolean} [radioOnly]
	 */

	/** @type {Props & { [key: string]: any }} */
	let {
		changeHandler = null,
		name = '',
		label = '',
		value = '',
		checked = false,
		radioOnly = false,
		...rest
	} = $props();
</script>

{#if radioOnly}
	<label class="radio-only" for="">
		<input class="hidden" type="radio" {value} {name} {checked} onchange={bubble('change')} />

		<div
			class="w-[15px] h-[15px] p-[2px] border rounded-full"
			class:border-mid-grey={checked}
			class:border-mid-warm-grey={!checked}
		>
			{#if checked}
				<span class="block w-[9px] h-[9px] relative bg-dark-grey rounded-full"></span>
			{/if}
		</div>
	</label>
{:else}
	<label class={`label ${rest.class}`}>
		<input
			class="hidden"
			type="radio"
			{value}
			{name}
			{checked}
			onchange={preventDefault(changeHandler)}
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
