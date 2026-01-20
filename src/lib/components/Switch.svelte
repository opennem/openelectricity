<script>
	import { createEventDispatcher } from 'svelte';
	import Icon from './Icon.svelte';

	const dispatch = createEventDispatcher();

	/**
	 * @typedef {Object} Props
	 * @property {{ label: string, value: string | number, icon?: string }[]} [buttons]
	 * @property {string | number } [selected]
	 * @property {(value: string) => void} [onChange]
	 * @property {number} [xPad]
	 * @property {number} [yPad]
	 * @property {string} [textSize]
	 * @property {string} [roundedSize]
	 */

	/** @type {Props & { [key: string]: any }} */
	let {
		buttons = [],
		selected = '',
		onChange = () => {},
		xPad = 8,
		yPad = 4,
		textSize = 'sm',
		roundedSize = 'xl',
		...rest
	} = $props();

	let isSelected = $derived((value) => selected === value);

	function handleClick(e) {
		onChange(e.currentTarget.value);
		dispatch('change', { value: e.currentTarget.value });
	}
</script>

<div
	class={`flex md:inline-flex text-${textSize} w-auto mx-10 md:mx-0 rounded-${roundedSize} bg-light-warm-grey border border-solid border-mid-warm-grey ${rest.class}`}
>
	{#each buttons as { label, value, icon }}
		<button
			onclick={handleClick}
			{value}
			class="flex w-full md:w-auto items-center justify-center hover:text-black px-{xPad} py-{yPad} border rounded-{roundedSize} whitespace-nowrap"
			class:bg-white={isSelected(value)}
			class:text-black={isSelected(value)}
			class:border-black={isSelected(value)}
			class:shadow-lg={isSelected(value)}
			class:text-mid-grey={!isSelected(value)}
			class:border-transparent={!isSelected(value)}
		>
			{label}
			{#if icon}
				<Icon
					{icon}
					size={16}
					class={`ml-4 ${selected === value ? 'text-success-green' : 'text-transparent'}`}
				/>
			{/if}
		</button>
	{/each}
</div>

<style>
	.shadow {
		box-shadow: 0.2rem 0 0.3rem 0 rgba(0, 0, 0, 0.1);
	}
</style>
